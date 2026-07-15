import type {
  ChunkRecord,
  EmbeddingProviderHealth,
  QueryEmbeddingProvider,
  ReconcileChunksResult,
  RetrievedChunk,
  VectorSearchStore,
} from "./rag.types";
import {
  getVectorReconcileMaxAttempts,
  getVectorReconcileRetryDelayMs,
  retryAsync,
  toDegradedReconcileResult,
} from "./vector-reconcile";
import { embedTexts } from "./rag-retrieval";

function normalizeToken(token: string): string {
  return token.trim().toLowerCase();
}

function isCjkCharacter(character: string): boolean {
  return /[\u3400-\u9fff]/u.test(character);
}

function tokenizeCjk(text: string): string[] {
  const compact = text.replace(/\s+/g, "");
  if (!compact) {
    return [];
  }

  const characters = [...compact].filter(isCjkCharacter);
  if (characters.length === 0) {
    return [];
  }

  const tokens = new Set<string>();

  for (const character of characters) {
    tokens.add(character);
  }

  for (let index = 0; index < characters.length - 1; index += 1) {
    tokens.add(`${characters[index]}${characters[index + 1]}`);
  }

  return [...tokens];
}

function tokenize(text: string): string[] {
  const latinTokens = text
    .split(/[\s,.;:!?()[\]{}"'\r\n/\\-]+/)
    .map(normalizeToken)
    .filter(Boolean);

  const cjkTokens = tokenizeCjk(text);
  return [...new Set([...latinTokens, ...cjkTokens])];
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function toQdrantPointId(chunkId: string): string {
  return chunkId.replace(/^chunk_/, "");
}

function toChunkId(pointId: string): string {
  return pointId.startsWith("chunk_") ? pointId : `chunk_${pointId}`;
}

interface QdrantScrollResponse {
  result?: {
    points?: Array<{
      id?: string | number;
      payload?: Record<string, unknown>;
    }>;
    next_page_offset?: string | number | null;
  };
}

export class SimpleEmbeddingProvider implements QueryEmbeddingProvider {
  constructor(
    private readonly dimensions = 12,
    private readonly healthDetail?: string,
    private readonly healthStatus: "ok" | "error" = "ok",
  ) {}

  async embedQuery(text: string): Promise<number[]> {
    const vectors = await this.embedDocuments([text]);
    return vectors[0] ?? Array.from({ length: this.dimensions }, () => 0);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedSingle(text));
  }

  private embedSingle(text: string): number[] {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = tokenize(text);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      let accumulator = 0;
      for (const character of token) {
        accumulator += character.charCodeAt(0);
      }

      const slot = accumulator % this.dimensions;
      vector[slot] = (vector[slot] ?? 0) + 1;
    }

    return vector.map((value) => value / tokens.length);
  }

  async healthCheck(): Promise<EmbeddingProviderHealth> {
    return {
      driver: "simple",
      status: this.healthStatus,
      detail:
        this.healthDetail
        ?? `SimpleEmbeddingProvider is active with ${this.dimensions} dimensions.`,
    };
  }
}

export class OpenAICompatibleEmbeddingProvider implements QueryEmbeddingProvider {
  private lastError: string | null = null;
  private lastVerifiedAt: number | null = null;

  constructor(
    private readonly options: {
      baseUrl: string;
      apiKey: string;
      model: string;
      timeoutMs?: number;
      expectedDimensions?: number;
    },
  ) {}

  async embedQuery(text: string): Promise<number[]> {
    const vectors = await this.embedDocuments([text]);
    return vectors[0] ?? [];
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await this.fetchEmbeddings(texts);

    if (!response.ok) {
      const detail = await response.text();
      this.lastError =
        `Embedding provider request failed with status ${response.status}: ${detail.slice(0, 240)}`;
      throw new Error(this.lastError);
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const rows = payload.data ?? [];

    if (rows.length !== texts.length) {
      this.lastError =
        `Embedding provider returned ${rows.length} vectors for ${texts.length} inputs.`;
      throw new Error(this.lastError);
    }

    const vectors = rows.map((row, index) => {
      const embedding = row.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        this.lastError = `Embedding provider returned no vector at index ${index}.`;
        throw new Error(this.lastError);
      }

      const vector = embedding.map((value) => Number(value) || 0);
      if (
        this.options.expectedDimensions &&
        vector.length !== this.options.expectedDimensions
      ) {
        this.lastError =
          `Embedding vector dimension mismatch: expected ${this.options.expectedDimensions}, `
          + `received ${vector.length}.`;
        throw new Error(this.lastError);
      }

      return vector;
    });

    this.lastError = null;
    this.lastVerifiedAt = Date.now();
    return vectors;
  }

  async healthCheck(): Promise<EmbeddingProviderHealth> {
    if (!this.lastVerifiedAt) {
      try {
        await this.embedQuery("embedding provider health check");
      } catch {
        return {
          driver: "openai-compatible",
          status: "error",
          detail: this.lastError ?? "Embedding provider probe failed.",
        };
      }
    }

    if (this.lastError) {
      return {
        driver: "openai-compatible",
        status: "error",
        detail: this.lastError,
      };
    }

    return {
      driver: "openai-compatible",
      status: "ok",
      detail:
        `OpenAI-compatible embedding provider is verified for ${this.options.model}. `
        + "Live requests will downgrade to local embeddings on failure.",
    };
  }

  private async fetchEmbeddings(input: string | string[]): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = Math.max(1000, this.options.timeoutMs ?? 10000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/embeddings`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.options.model,
          input,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.lastError = `Embedding provider timed out after ${timeoutMs}ms.`;
        throw new Error(this.lastError, { cause: error });
      }

      this.lastError = error instanceof Error ? error.message : String(error);
      throw new Error(this.lastError, { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class DegradingEmbeddingProvider implements QueryEmbeddingProvider {
  private degraded = false;
  private lastError: string | null = null;

  constructor(
    private readonly primary: QueryEmbeddingProvider,
    private readonly fallback: QueryEmbeddingProvider,
  ) {}

  async embedQuery(text: string): Promise<number[]> {
    if (this.degraded) {
      return this.fallback.embedQuery(text);
    }

    try {
      const vector = await this.primary.embedQuery(text);
      this.degraded = false;
      this.lastError = null;
      return vector;
    } catch (error) {
      this.degraded = true;
      this.lastError = error instanceof Error ? error.message : String(error);
      return this.fallback.embedQuery(text);
    }
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (this.degraded) {
      return embedTexts(this.fallback, texts);
    }

    try {
      const vectors = await embedTexts(this.primary, texts);
      this.degraded = false;
      this.lastError = null;
      return vectors;
    } catch (error) {
      this.degraded = true;
      this.lastError = error instanceof Error ? error.message : String(error);
      return embedTexts(this.fallback, texts);
    }
  }

  async healthCheck(): Promise<EmbeddingProviderHealth> {
    if (this.degraded) {
      return {
        driver: "openai-compatible",
        status: "error",
        detail:
          `Remote embedding provider degraded. Serving local embeddings instead. `
          + `${this.lastError ?? "Unknown error."}`,
      };
    }

    return this.primary.healthCheck();
  }
}

export class InMemoryQdrantStore implements VectorSearchStore {
  constructor(
    private readonly chunks: () => ChunkRecord[] | Promise<ChunkRecord[]>,
  ) {}

  async ensureReady(): Promise<void> {}

  async upsertChunk(): Promise<void> {}

  async deleteChunksByDocument(): Promise<void> {}

  async reconcileChunks(chunks: ChunkRecord[]): Promise<{
    upserted: number;
    deleted: number;
    total: number;
    status: "synced" | "degraded";
    attempts: number;
    error?: string;
  }> {
    return {
      upserted: chunks.length,
      deleted: 0,
      total: chunks.length,
      status: "synced",
      attempts: 1,
    };
  }

  async healthCheck(): Promise<{
    driver: "memory" | "qdrant";
    status: "ok" | "error";
    detail?: string;
  }> {
    return {
      driver: "memory",
      status: "ok",
      detail: "In-memory vector store is active.",
    };
  }

  async search(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    queryVector: number[];
    topK: number;
  }): Promise<RetrievedChunk[]> {
    const allowedKnowledgeBaseIds = new Set(input.knowledgeBaseIds);

    return (await this.chunks())
      .filter(
        (chunk) =>
          chunk.workspaceId === input.workspaceId &&
          allowedKnowledgeBaseIds.has(chunk.knowledgeBaseId),
      )
      .map((chunk) => ({
        chunkId: chunk.id,
        workspaceId: chunk.workspaceId,
        knowledgeBaseId: chunk.knowledgeBaseId,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        sectionTitle: chunk.sectionTitle,
        content: chunk.content,
        score: cosineSimilarity(input.queryVector, chunk.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);
  }
}

export class QdrantVectorStore implements VectorSearchStore {
  private readyPromise: Promise<void> | null = null;

  constructor(
    private readonly options: {
      baseUrl: string;
      collectionName: string;
      dimensions: number;
    },
  ) {}

  async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.createCollectionIfNeeded();
    }

    await this.readyPromise;
  }

  async upsertChunk(chunk: ChunkRecord): Promise<void> {
    await this.ensureReady();

    const response = await fetch(this.collectionUrl("points"), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        points: [
          {
            id: toQdrantPointId(chunk.id),
            vector: chunk.embedding,
            payload: {
              chunkId: chunk.id,
              workspaceId: chunk.workspaceId,
              knowledgeBaseId: chunk.knowledgeBaseId,
              documentId: chunk.documentId,
              documentTitle: chunk.documentTitle,
              sectionTitle: chunk.sectionTitle,
              content: chunk.content,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant upsert failed with status ${response.status}.`);
    }
  }

  async deleteChunksByDocument(documentId: string): Promise<void> {
    await this.ensureReady();

    const response = await fetch(this.collectionUrl("points/delete"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "documentId",
              match: { value: documentId },
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant delete failed with status ${response.status}.`);
    }
  }

  async search(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    queryVector: number[];
    topK: number;
  }): Promise<RetrievedChunk[]> {
    await this.ensureReady();

    const response = await fetch(this.collectionUrl("points/search"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        vector: input.queryVector,
        limit: input.topK,
        with_payload: true,
        filter: {
          must: [
            {
              key: "workspaceId",
              match: { value: input.workspaceId },
            },
            {
              key: "knowledgeBaseId",
              match: { any: input.knowledgeBaseIds },
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant search failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      result?: Array<{
        score?: number;
        payload?: Record<string, unknown>;
      }>;
    };

    return (payload.result ?? [])
      .map((item) => {
        const data = item.payload ?? {};
        return {
          chunkId: String(data.chunkId ?? ""),
          workspaceId: String(data.workspaceId ?? ""),
          knowledgeBaseId: String(data.knowledgeBaseId ?? ""),
          documentId: String(data.documentId ?? ""),
          documentTitle: String(data.documentTitle ?? ""),
          sectionTitle:
            data.sectionTitle === null || data.sectionTitle === undefined
              ? null
              : String(data.sectionTitle),
          content: String(data.content ?? ""),
          score: Number(item.score ?? 0),
        };
      })
      .filter((item) => item.chunkId && item.workspaceId && item.knowledgeBaseId && item.documentId);
  }

  async reconcileChunks(chunks: ChunkRecord[]): Promise<ReconcileChunksResult> {
    try {
      const result = await retryAsync(
        async () => {
          await this.ensureReady();

          const desiredChunkIds = new Set(chunks.map((chunk) => chunk.id));
          const existingPoints = await this.scrollAllPoints();
          const stalePointIds = existingPoints
            .filter((point) => !desiredChunkIds.has(point.chunkId))
            .map((point) => point.pointId);

          if (stalePointIds.length > 0) {
            await this.deletePointsByIds(stalePointIds);
          }

          for (const chunk of chunks) {
            await this.upsertChunk(chunk);
          }

          return {
            upserted: chunks.length,
            deleted: stalePointIds.length,
            total: chunks.length,
          };
        },
        {
          maxAttempts: getVectorReconcileMaxAttempts(),
          retryDelayMs: getVectorReconcileRetryDelayMs(),
        },
      );

      return {
        ...result.value,
        status: "synced",
        attempts: result.attempts,
      };
    } catch (error) {
      return toDegradedReconcileResult({
        total: chunks.length,
        attempts: getVectorReconcileMaxAttempts(),
        error,
      });
    }
  }

  async healthCheck(): Promise<{
    driver: "memory" | "qdrant";
    status: "ok" | "error";
    detail?: string;
  }> {
    try {
      await this.ensureReady();
      const response = await fetch(this.collectionUrl(), {
        method: "GET",
      });

      if (!response.ok) {
        return {
          driver: "qdrant",
          status: "error",
          detail: `Qdrant collection check failed with status ${response.status}.`,
        };
      }

      return {
        driver: "qdrant",
        status: "ok",
        detail: `Qdrant collection ${this.options.collectionName} is reachable.`,
      };
    } catch (error) {
      return {
        driver: "qdrant",
        status: "error",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async createCollectionIfNeeded(): Promise<void> {
    const response = await fetch(this.collectionUrl(), {
    });

    if (response.ok) {
      return;
    }

    if (response.status !== 404) {
      throw new Error(`Qdrant readiness check failed with status ${response.status}.`);
    }

    const createResponse = await fetch(this.collectionUrl(), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        vectors: {
          size: this.options.dimensions,
          distance: "Cosine",
        },
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Qdrant collection create failed with status ${createResponse.status}.`);
    }
  }

  private collectionUrl(suffix = ""): string {
    const base = this.options.baseUrl.replace(/\/$/, "");
    const collectionPath = `${base}/collections/${encodeURIComponent(this.options.collectionName)}`;
    return suffix ? `${collectionPath}/${suffix}` : collectionPath;
  }

  private async scrollAllPoints(): Promise<Array<{ pointId: string; chunkId: string }>> {
    const points: Array<{ pointId: string; chunkId: string }> = [];
    let offset: string | number | null = null;

    while (true) {
      const responsePayload: QdrantScrollResponse = await this.fetchJson<QdrantScrollResponse>(
        this.collectionUrl("points/scroll"),
        {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          limit: 256,
          with_payload: ["chunkId"],
          with_vector: false,
          ...(offset !== null ? { offset } : {}),
        }),
      });

      const batch = responsePayload.result?.points ?? [];
      for (const point of batch) {
        const pointId = String(point.id ?? "");
        const payloadChunkId = point.payload?.chunkId;
        const chunkId = typeof payloadChunkId === "string" && payloadChunkId
          ? payloadChunkId
          : toChunkId(pointId);

        if (!pointId) {
          continue;
        }

        points.push({ pointId, chunkId });
      }

      offset = responsePayload.result?.next_page_offset ?? null;
      if (!offset || batch.length === 0) {
        break;
      }
    }

    return points;
  }

  private async deletePointsByIds(pointIds: string[]): Promise<void> {
    const response = await fetch(this.collectionUrl("points/delete"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        points: pointIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant delete-by-id failed with status ${response.status}.`);
    }
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`Qdrant request failed with status ${response.status}.`);
    }
    return (await response.json()) as T;
  }
}

export function keywordOverlapScore(query: string, content: string): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return 0;
  }

  const contentTokens = new Set(tokenize(content));
  let matched = 0;

  for (const token of queryTokens) {
    if (contentTokens.has(token)) {
      matched += 1;
    }
  }

  return matched / queryTokens.size;
}
