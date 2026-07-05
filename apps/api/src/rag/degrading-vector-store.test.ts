import assert from "node:assert/strict";
import test from "node:test";

import { DegradingVectorStore } from "./degrading-vector-store";
import { InMemoryQdrantStore } from "./rag.providers";
import type { ChunkRecord, ReconcileChunksResult, VectorSearchStore } from "./rag.types";

function createChunk(input: Partial<ChunkRecord> & Pick<ChunkRecord, "id" | "workspaceId">): ChunkRecord {
  return {
    knowledgeBaseId: "kb_1",
    documentId: "doc_1",
    documentTitle: "Doc 1",
    content: "workspace scoped content",
    embedding: [0.9, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ...input,
  };
}

class FailingVectorStore implements VectorSearchStore {
  constructor(private readonly chunks: ChunkRecord[]) {}

  async ensureReady(): Promise<void> {
    throw new Error("qdrant unavailable");
  }

  async upsertChunk(): Promise<void> {
    throw new Error("qdrant unavailable");
  }

  async deleteChunksByDocument(): Promise<void> {
    throw new Error("qdrant unavailable");
  }

  async reconcileChunks(chunks: ChunkRecord[]): Promise<ReconcileChunksResult> {
    throw new Error(`qdrant reconcile failed for ${chunks.length} chunks`);
  }

  async healthCheck() {
    return {
      driver: "qdrant" as const,
      status: "error" as const,
      detail: "Qdrant unreachable.",
    };
  }

  async search(): Promise<never> {
    throw new Error("qdrant unavailable");
  }

  listChunks() {
    return this.chunks;
  }
}

test("degrading vector store falls back to repository search with workspace isolation", async () => {
  const chunks = [
    createChunk({ id: "chunk_ws_a", workspaceId: "ws_a", content: "alpha deployment guide" }),
    createChunk({ id: "chunk_ws_b", workspaceId: "ws_b", content: "beta pricing notes" }),
  ];
  const fallback = new InMemoryQdrantStore(async () => chunks);
  const store = new DegradingVectorStore(new FailingVectorStore(chunks), fallback);

  await store.ensureReady();
  assert.equal(store.isDegraded(), true);

  const results = await store.search({
    workspaceId: "ws_a",
    knowledgeBaseIds: ["kb_1"],
    queryVector: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    topK: 3,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.workspaceId, "ws_a");
  assert.equal(results[0]?.chunkId, "chunk_ws_a");
});

test("degrading vector store reconcile returns degraded without throwing", async () => {
  const chunks = [createChunk({ id: "chunk_1", workspaceId: "ws_1" })];
  const fallback = new InMemoryQdrantStore(async () => chunks);
  const store = new DegradingVectorStore(new FailingVectorStore(chunks), fallback);

  const result = await store.reconcileChunks(chunks);

  assert.equal(result.status, "degraded");
  assert.equal(result.total, 1);
  assert.match(result.error ?? "", /qdrant reconcile failed/);
  assert.equal(store.isDegraded(), true);
});

test("degrading vector store healthCheck reports fallback mode", async () => {
  const chunks = [createChunk({ id: "chunk_1", workspaceId: "ws_1" })];
  const fallback = new InMemoryQdrantStore(async () => chunks);
  const store = new DegradingVectorStore(new FailingVectorStore(chunks), fallback);

  await store.ensureReady();
  const health = await store.healthCheck();

  assert.equal(health.driver, "qdrant");
  assert.equal(health.status, "error");
  assert.match(health.detail ?? "", /repository fallback/);
});

test("degrading vector store reconcile with empty knowledge base stays degraded", async () => {
  const fallback = new InMemoryQdrantStore(async () => []);
  const store = new DegradingVectorStore(new FailingVectorStore([]), fallback);

  const result = await store.reconcileChunks([]);

  assert.equal(result.status, "degraded");
  assert.equal(result.total, 0);
  assert.equal(result.upserted, 0);
});
