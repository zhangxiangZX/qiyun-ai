import assert from "node:assert/strict";
import test from "node:test";

import type { ChunkRecord } from "./rag.types";
import {
  buildVectorIndexConsistencyLog,
  buildVectorIndexSyncSnapshot,
  emitVectorIndexConsistencyLog,
  formatVectorIndexConsistencyLogLine,
  summarizeChunksByWorkspace,
} from "./vector-index-log";

function chunk(input: Partial<ChunkRecord> & Pick<ChunkRecord, "id" | "workspaceId">): ChunkRecord {
  return {
    knowledgeBaseId: "kb_1",
    documentId: "doc_1",
    documentTitle: "Doc",
    content: "sample",
    sectionTitle: null,
    chunkIndex: null,
    embedding: [0.1],
    ...input,
  };
}

test("summarizeChunksByWorkspace keeps workspace isolation", () => {
  const summary = summarizeChunksByWorkspace([
    chunk({ id: "c1", workspaceId: "ws_a", documentId: "doc_a1", knowledgeBaseId: "kb_a" }),
    chunk({ id: "c2", workspaceId: "ws_a", documentId: "doc_a1", knowledgeBaseId: "kb_a" }),
    chunk({ id: "c3", workspaceId: "ws_b", documentId: "doc_b1", knowledgeBaseId: "kb_b" }),
  ]);

  assert.equal(summary.length, 2);
  assert.deepEqual(summary[0], {
    workspaceId: "ws_a",
    chunkCount: 2,
    documentCount: 1,
    knowledgeBaseCount: 1,
  });
  assert.deepEqual(summary[1], {
    workspaceId: "ws_b",
    chunkCount: 1,
    documentCount: 1,
    knowledgeBaseCount: 1,
  });
});

test("buildVectorIndexSyncSnapshot handles empty knowledge base", () => {
  const snapshot = buildVectorIndexSyncSnapshot({
    chunks: [],
    reconcile: {
      upserted: 0,
      deleted: 0,
      total: 0,
      status: "synced",
      attempts: 1,
    },
    vectorDriver: "qdrant",
  });

  assert.equal(snapshot.documentCount, 0);
  assert.equal(snapshot.knowledgeBaseCount, 0);
  assert.deepEqual(snapshot.workspaceSummary, []);
});

test("buildVectorIndexConsistencyLog includes degraded error details", () => {
  const event = buildVectorIndexConsistencyLog({
    trigger: "startup",
    occurredAt: "2026-07-01T00:00:00.000Z",
    snapshot: buildVectorIndexSyncSnapshot({
      chunks: [chunk({ id: "c1", workspaceId: "ws_1" })],
      reconcile: {
        upserted: 0,
        deleted: 0,
        total: 1,
        status: "degraded",
        attempts: 3,
        error: "Qdrant request failed with status 500.",
      },
      vectorDriver: "qdrant",
    }),
  });

  assert.equal(event.event, "vector_index.consistency");
  assert.equal(event.level, "warn");
  assert.equal(event.status, "degraded");
  assert.equal(event.error, "Qdrant request failed with status 500.");
  assert.equal(event.workspaceCount, 1);
});

test("formatVectorIndexConsistencyLogLine returns parseable json", () => {
  const line = formatVectorIndexConsistencyLogLine(
    buildVectorIndexConsistencyLog({
      trigger: "startup",
      snapshot: buildVectorIndexSyncSnapshot({
        chunks: [],
        reconcile: {
          upserted: 0,
          deleted: 0,
          total: 0,
          status: "synced",
          attempts: 1,
        },
        vectorDriver: "memory",
      }),
    }),
  );

  const parsed = JSON.parse(line.trim()) as { event: string; vectorDriver: string };
  assert.equal(parsed.event, "vector_index.consistency");
  assert.equal(parsed.vectorDriver, "memory");
});

test("emitVectorIndexConsistencyLog writes warn events to stderr", () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  emitVectorIndexConsistencyLog(
    buildVectorIndexConsistencyLog({
      trigger: "startup",
      snapshot: buildVectorIndexSyncSnapshot({
        chunks: [],
        reconcile: {
          upserted: 0,
          deleted: 0,
          total: 0,
          status: "degraded",
          attempts: 2,
          error: "down",
        },
        vectorDriver: "qdrant",
      }),
    }),
    {
      stdout: { write: (chunk) => { stdout.push(String(chunk)); return true; } },
      stderr: { write: (chunk) => { stderr.push(String(chunk)); return true; } },
    },
  );

  assert.equal(stdout.length, 0);
  assert.equal(stderr.length, 1);
  assert.match(stderr[0] ?? "", /"level":"warn"/);
});
