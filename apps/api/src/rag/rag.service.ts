import { randomUUID } from "node:crypto";

import type { DocumentService } from "../documents/document.service";
import { normalizeBotRecord } from "./bot-defaults";
import { normalizeRecommendedQuestions } from "./recommended-questions";
import {
  keywordOverlapScore,
  SimpleEmbeddingProvider,
} from "./rag.providers";
import type { RagRepository } from "./rag.repository";
import type {
  BotRecord,
  ChunkRecord,
  QueryEmbeddingProvider,
  RagCitation,
  RagSearchResult,
  RetrievedChunk,
  VectorSearchStore,
} from "./rag.types";
import {
  buildVectorIndexSyncSnapshot,
  type VectorIndexSyncSnapshot,
} from "./vector-index-log";

export class RagAccessError extends Error {}
export class RagValidationError extends Error {}

function toSnippet(content: string): string {
  return content.length <= 160 ? content : `${content.slice(0, 157)}...`;
}

function estimateChunkReadability(content: string): number {
  const compact = content.replace(/\s+/g, "");
  if (!compact) {
    return 0;
  }

  let readable = 0;
  for (const character of compact) {
    if (/[A-Za-z0-9]/.test(character) || /[\u3400-\u9fff]/u.test(character)) {
      readable += 1;
      continue;
    }

    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0x20 && codePoint <= 0x7e) {
      readable += 0.35;
    }
  }

  return readable / compact.length;
}

function getChunkKeywordSignals(query: string, chunk: RetrievedChunk): {
  titleOverlap: number;
  contentOverlap: number;
  bestOverlap: number;
} {
  const titleOverlap = keywordOverlapScore(query, chunk.documentTitle);
  const contentOverlap = keywordOverlapScore(query, chunk.content);
  return {
    titleOverlap,
    contentOverlap,
    bestOverlap: Math.max(titleOverlap, contentOverlap),
  };
}

function hasPreferredTextCompanion(
  chunk: RetrievedChunk,
  candidates: RetrievedChunk[],
): boolean {
  if (!chunk.documentTitle.endsWith(".pdf")) {
    return false;
  }

  const preferredTitle = `${chunk.documentTitle}.txt`;
  return candidates.some(
    (candidate) =>
      candidate.documentTitle === preferredTitle
      && candidate.documentId !== chunk.documentId,
  );
}

export class RagService {
  constructor(
    private readonly repository: RagRepository,
    private readonly vectorStore: VectorSearchStore,
    private readonly documents: DocumentService,
    private readonly embeddingProvider: QueryEmbeddingProvider = new SimpleEmbeddingProvider(),
    private readonly retrievalThreshold = 0.55,
  ) {}

  async upsertBot(input: {
    id: string;
    workspaceId: string;
    name?: string;
    status?: BotRecord["status"];
    knowledgeBaseIds?: string[];
    description?: string;
    welcomeMessage?: string;
    recommendedQuestions?: string[];
    systemPrompt?: string;
    collectLeadsOnFailure?: boolean;
    rateLimitPerMinute?: number;
    allowedDomains?: string[];
    leadFields?: string[];
  }): Promise<BotRecord> {
    const existing = await this.repository.findBotById(input.id);
    const knowledgeBaseIds = input.knowledgeBaseIds ?? existing?.knowledgeBaseIds ?? [];

    for (const knowledgeBaseId of knowledgeBaseIds) {
      await this.documents.getKnowledgeBase(input.workspaceId, knowledgeBaseId);
    }

    if (input.recommendedQuestions !== undefined && !Array.isArray(input.recommendedQuestions)) {
      throw new RagValidationError("recommendedQuestions must be an array of strings.");
    }

    const record = normalizeBotRecord({
      ...existing,
      ...input,
      recommendedQuestions:
        input.recommendedQuestions !== undefined
          ? normalizeRecommendedQuestions(input.recommendedQuestions)
          : existing?.recommendedQuestions,
      id: input.id,
      workspaceId: input.workspaceId,
      name: (input.name ?? existing?.name ?? input.id).trim(),
      status: input.status ?? existing?.status,
      knowledgeBaseIds,
    });

    return this.repository.upsertBot(record);
  }

  async patchBot(input: {
    id: string;
    workspaceId: string;
    patch: Partial<
      Omit<BotRecord, "id" | "workspaceId" | "updatedAt">
    >;
  }): Promise<BotRecord> {
    const existing = await this.repository.findBotById(input.id);
    if (!existing || existing.workspaceId !== input.workspaceId) {
      throw new RagAccessError("Bot not found in workspace.");
    }

    return this.upsertBot({
      id: input.id,
      workspaceId: input.workspaceId,
      ...input.patch,
    });
  }

  async getBot(workspaceId: string, botId: string): Promise<BotRecord> {
    return this.requireBot(workspaceId, botId);
  }

  async createBot(input: {
    workspaceId: string;
    name: string;
    status?: BotRecord["status"];
    knowledgeBaseIds?: string[];
  }): Promise<BotRecord> {
    return this.upsertBot({
      id: `bot_${randomUUID()}`,
      workspaceId: input.workspaceId,
      name: input.name,
      status: input.status,
      knowledgeBaseIds: input.knowledgeBaseIds,
    });
  }

  async indexChunk(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    documentId: string;
    documentTitle: string;
    content: string;
  }): Promise<ChunkRecord> {
    const content = input.content.trim();
    if (!content) {
      throw new RagValidationError("Chunk content is required.");
    }

    await this.documents.getKnowledgeBase(input.workspaceId, input.knowledgeBaseId);
    await this.documents.getDocument(input.workspaceId, input.documentId);

    const embedding = await this.embeddingProvider.embedQuery(content);

    const chunk = await this.repository.createChunk({
      id: `chunk_${randomUUID()}`,
      workspaceId: input.workspaceId,
      knowledgeBaseId: input.knowledgeBaseId,
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      content,
      embedding,
    });
    await this.vectorStore.upsertChunk(chunk);
    return chunk;
  }

  async replaceDocumentChunks(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    documentId: string;
    documentTitle: string;
    chunks: Array<{ content: string }>;
  }): Promise<ChunkRecord[]> {
    await this.documents.getKnowledgeBase(input.workspaceId, input.knowledgeBaseId);
    await this.documents.getDocument(input.workspaceId, input.documentId);
    await this.repository.deleteChunksByDocument(input.documentId);
    await this.vectorStore.deleteChunksByDocument(input.documentId);

    const created: ChunkRecord[] = [];

    for (const content of input.chunks.map((chunk) => chunk.content.trim()).filter(Boolean)) {
      created.push(
        await this.indexChunk({
          workspaceId: input.workspaceId,
          knowledgeBaseId: input.knowledgeBaseId,
          documentId: input.documentId,
          documentTitle: input.documentTitle,
          content,
        }),
      );
    }

    return created;
  }

  async deleteDocumentChunks(
    workspaceId: string,
    documentId: string,
  ): Promise<{ removedChunkCount: number }> {
    const document = await this.documents.getDocument(workspaceId, documentId);
    await this.documents.getKnowledgeBase(workspaceId, document.knowledgeBaseId);
    const removedChunkCount = await this.repository.deleteChunksByDocument(documentId);
    await this.vectorStore.deleteChunksByDocument(documentId);
    return { removedChunkCount };
  }

  async search(input: {
    workspaceId: string;
    botId: string;
    query: string;
    topK?: number;
    maxCitations?: number;
  }): Promise<RagSearchResult> {
    const bot = await this.requireBot(input.workspaceId, input.botId);
    const query = input.query.trim();

    if (!query) {
      throw new RagValidationError("Query is required.");
    }

    if (bot.status !== "active") {
      throw new RagAccessError("Bot is not active.");
    }

    if (bot.knowledgeBaseIds.length === 0) {
      return this.emptyResult(input.workspaceId, bot.id, query);
    }

    for (const knowledgeBaseId of bot.knowledgeBaseIds) {
      await this.documents.getKnowledgeBase(input.workspaceId, knowledgeBaseId);
    }

    await this.vectorStore.ensureReady();
    const queryVector = await this.embeddingProvider.embedQuery(query);
    const retrievalTopK = Math.max((input.topK ?? 6) * 4, 12);
    const retrieved = await this.vectorStore.search({
      workspaceId: input.workspaceId,
      knowledgeBaseIds: bot.knowledgeBaseIds,
      queryVector,
      topK: retrievalTopK,
    });

    if (retrieved.length === 0) {
      return this.emptyResult(input.workspaceId, bot.id, query);
    }

    const reranked = this.rerank(query, retrieved).slice(
      0,
      input.maxCitations ?? 3,
    );
    const bestScore = reranked[0]?.score ?? null;
    const bestKeywordScore = reranked[0]
      ? getChunkKeywordSignals(query, reranked[0]).bestOverlap
      : 0;
    const allowKeywordHit = bestKeywordScore >= 0.25;

    if (
      bestScore === null
      || (bestScore < this.retrievalThreshold && !allowKeywordHit)
    ) {
      return {
        botId: bot.id,
        workspaceId: input.workspaceId,
        query,
        citations: [],
        contextBlocks: [],
        needsLeadCapture: true,
        retrievalScore: bestScore,
      };
    }

    const citations = reranked.map((chunk) => this.toCitation(chunk));

    return {
      botId: bot.id,
      workspaceId: input.workspaceId,
      query,
      citations,
      contextBlocks: reranked.map(
        (chunk) => `[${chunk.documentTitle}#${chunk.chunkId}] ${chunk.content}`,
      ),
      needsLeadCapture: false,
      retrievalScore: bestScore,
    };
  }

  async listBots(workspaceId: string): Promise<BotRecord[]> {
    return this.repository.listBotsByWorkspace(workspaceId);
  }

  async syncStoredChunks(): Promise<VectorIndexSyncSnapshot> {
    await this.vectorStore.ensureReady();
    const chunks = await this.repository.listChunks();
    const vectorHealth = await this.vectorStore.healthCheck();
    const reconcile = await this.vectorStore.reconcileChunks(chunks);

    return buildVectorIndexSyncSnapshot({
      chunks,
      reconcile,
      vectorDriver: vectorHealth.driver,
    });
  }

  async getVectorStoreHealth() {
    return this.vectorStore.healthCheck();
  }

  async getEmbeddingProviderHealth() {
    return this.embeddingProvider.healthCheck();
  }

  private rerank(query: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
    return chunks
      .filter((chunk, _index, candidates) => !hasPreferredTextCompanion(chunk, candidates))
      .filter((chunk) => estimateChunkReadability(chunk.content) >= 0.2)
      .map((chunk) => {
        const signals = getChunkKeywordSignals(query, chunk);
        const rerankedScore = Number(
          (
            (chunk.score * 0.55)
            + (signals.contentOverlap * 0.2)
            + (signals.titleOverlap * 0.45)
          ).toFixed(4),
        );
        return { ...chunk, score: rerankedScore };
      })
      .sort((left, right) => right.score - left.score);
  }

  private toCitation(chunk: RetrievedChunk): RagCitation {
    return {
      chunkId: chunk.chunkId,
      knowledgeBaseId: chunk.knowledgeBaseId,
      documentId: chunk.documentId,
      title: chunk.documentTitle,
      score: chunk.score,
      snippet: toSnippet(chunk.content),
    };
  }

  private async requireBot(workspaceId: string, botId: string): Promise<BotRecord> {
    const bot = await this.repository.findBotById(botId);

    if (!bot || bot.workspaceId !== workspaceId) {
      throw new RagAccessError("Bot not found in workspace.");
    }

    return bot;
  }

  private emptyResult(
    workspaceId: string,
    botId: string,
    query: string,
  ): RagSearchResult {
    return {
      botId,
      workspaceId,
      query,
      citations: [],
      contextBlocks: [],
      needsLeadCapture: true,
      retrievalScore: null,
    };
  }
}
