import type {
  ChunkRecord,
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

export class DegradingVectorStore implements VectorSearchStore {
  private degraded = false;
  private lastError: string | null = null;

  constructor(
    private readonly primary: VectorSearchStore,
    private readonly fallback: VectorSearchStore,
  ) {}

  isDegraded(): boolean {
    return this.degraded;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async ensureReady(): Promise<void> {
    if (this.degraded) {
      await this.fallback.ensureReady();
      return;
    }

    try {
      await this.primary.ensureReady();
    } catch (error) {
      this.markDegraded(error);
      await this.fallback.ensureReady();
    }
  }

  async upsertChunk(chunk: ChunkRecord): Promise<void> {
    if (this.degraded) {
      return;
    }

    try {
      await retryAsync(() => this.primary.upsertChunk(chunk), {
        maxAttempts: getVectorReconcileMaxAttempts(),
        retryDelayMs: getVectorReconcileRetryDelayMs(),
      });
    } catch (error) {
      this.markDegraded(error);
    }
  }

  async deleteChunksByDocument(documentId: string): Promise<void> {
    if (this.degraded) {
      return;
    }

    try {
      await retryAsync(() => this.primary.deleteChunksByDocument(documentId), {
        maxAttempts: getVectorReconcileMaxAttempts(),
        retryDelayMs: getVectorReconcileRetryDelayMs(),
      });
    } catch (error) {
      this.markDegraded(error);
    }
  }

  async reconcileChunks(chunks: ChunkRecord[]): Promise<ReconcileChunksResult> {
    if (this.degraded) {
      const fallback = await this.fallback.reconcileChunks(chunks);
      return {
        ...fallback,
        status: "degraded",
        attempts: 0,
        error: this.lastError ?? "Vector index is in repository fallback mode.",
      };
    }

    try {
      const result = await retryAsync(() => this.primary.reconcileChunks(chunks), {
        maxAttempts: getVectorReconcileMaxAttempts(),
        retryDelayMs: getVectorReconcileRetryDelayMs(),
      });
      this.degraded = false;
      this.lastError = null;
      return {
        ...result.value,
        status: "synced",
        attempts: result.attempts,
      };
    } catch (error) {
      this.markDegraded(error);
      const fallback = await this.fallback.reconcileChunks(chunks);
      return {
        ...fallback,
        status: "degraded",
        attempts: getVectorReconcileMaxAttempts(),
        error: this.lastError ?? undefined,
      };
    }
  }

  async healthCheck(): Promise<{
    driver: "memory" | "qdrant";
    status: "ok" | "error";
    detail?: string;
  }> {
    const primary = await this.primary.healthCheck();
    if (this.degraded) {
      return {
        driver: primary.driver,
        status: "error",
        detail:
          `${primary.detail ?? "Qdrant is unavailable."} `
          + `Serving RAG from repository fallback.${this.lastError ? ` Last error: ${this.lastError}` : ""}`,
      };
    }
    return primary;
  }

  async search(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    queryVector: number[];
    topK: number;
  }): Promise<RetrievedChunk[]> {
    if (this.degraded) {
      return this.fallback.search(input);
    }

    try {
      return await this.primary.search(input);
    } catch (error) {
      this.markDegraded(error);
      return this.fallback.search(input);
    }
  }

  private markDegraded(error: unknown): void {
    this.degraded = true;
    this.lastError = error instanceof Error ? error.message : String(error);
  }
}
