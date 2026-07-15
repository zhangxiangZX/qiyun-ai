import { test } from "node:test";
import assert from "node:assert/strict";

import { InMemoryQdrantStore } from "./rag.providers";
import { InMemoryRagRepository } from "./rag.repository";
import type { ChunkRecord } from "./rag.types";

function chunk(input: Partial<ChunkRecord> & { id: string; workspaceId: string }): ChunkRecord {
  return {
    knowledgeBaseId: "kb",
    documentId: "doc",
    documentTitle: "doc.pdf",
    sectionTitle: null,
    chunkIndex: 0,
    content: "x",
    embedding: [1, 0, 0],
    ...input,
  };
}

test("listChunks scopes to the requested workspace; listAllChunks returns every tenant", async () => {
  const repo = new InMemoryRagRepository();
  repo.loadSnapshot({
    bots: [],
    chunks: [
      chunk({ id: "c_a", workspaceId: "ws_a", content: "alpha" }),
      chunk({ id: "c_b", workspaceId: "ws_b", content: "beta" }),
    ],
  });

  const scoped = await repo.listChunks("ws_a");
  assert.deepEqual(scoped.map((c) => c.id), ["c_a"]);

  const all = await repo.listAllChunks();
  assert.deepEqual(all.map((c) => c.id).sort(), ["c_a", "c_b"]);
});

test("shared in-memory fallback store never leaks another workspace at search", async () => {
  const repo = new InMemoryRagRepository();
  repo.loadSnapshot({
    bots: [],
    chunks: [
      chunk({ id: "c_a", workspaceId: "ws_a", knowledgeBaseId: "kb_a", content: "alpha guide" }),
      chunk({ id: "c_b", workspaceId: "ws_b", knowledgeBaseId: "kb_b", content: "beta notes" }),
    ],
  });

  // The runtime fallback store is loaded with ALL tenants via listAllChunks()
  // (see runtime.ts createVectorStore). The store must still scope by workspace at search.
  const fallback = new InMemoryQdrantStore(() => repo.listAllChunks());

  const results = await fallback.search({
    workspaceId: "ws_a",
    knowledgeBaseIds: ["kb_a"],
    queryVector: [1, 0, 0],
    topK: 10,
  });

  assert.deepEqual(results.map((c) => c.chunkId), ["c_a"]);
});
