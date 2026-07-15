import assert from "node:assert/strict";
import test from "node:test";

import {
  getDeadLetterDocumentJob,
  listDeadLetterDocumentJobs,
  requeueDeadLetterDocumentJob,
  resetDocumentDeadLetterQueueForTests,
  seedDeadLetterJobForTests,
} from "../documents/document-dead-letter-queue";
import type { DocumentDeadLetterJob } from "../documents/document.types";
import {
  buildHealthSnapshotForStack,
  createMockedQdrantVectorStore,
  createPlatformTestStack,
  probeLivePostgres,
  probeLiveQdrant,
  probeLiveRedis,
  seedWorkspaceBotWithChunk,
} from "./platform-stack";
import { DegradingVectorStore } from "../rag/degrading-vector-store";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "../rag/rag.providers";
import { InMemoryRagRepository } from "../rag/rag.repository";
import { createDocumentStorage } from "../documents/document-storage";

const liveIntegrationEnabled = process.env.QIYUN_INTEGRATION_TEST === "1";

function deadLetterJob(
  input: Partial<DocumentDeadLetterJob> & Pick<DocumentDeadLetterJob, "jobId" | "workspaceId">,
): DocumentDeadLetterJob {
  return {
    knowledgeBaseId: "kb_1",
    documentId: "doc_1",
    storageKey: "ws/doc",
    fileName: "file.txt",
    fileType: "text/plain",
    sizeBytes: 10,
    queuedAt: "2026-07-01T00:00:00.000Z",
    attempts: 3,
    failedAt: "2026-07-01T01:00:00.000Z",
    errorMessage: "index failed",
    ...input,
  };
}

test("integration: rag search keeps workspace tenant isolation", async () => {
  const stack = await createPlatformTestStack();
  try {
    await seedWorkspaceBotWithChunk({
      stack,
      workspaceId: "ws_alpha",
      botId: "bot_alpha",
      knowledgeBaseId: "kb_alpha",
      chunkId: "chunk_alpha",
      content: "private deployment guide for enterprise customers",
      foreignChunk: {
        workspaceId: "ws_beta",
        chunkId: "chunk_beta",
        content: "beta workspace pricing information",
      },
    });

    const result = await stack.ragService.search({
      workspaceId: "ws_alpha",
      botId: "bot_alpha",
      query: "private deployment enterprise",
    });

    assert.equal(result.workspaceId, "ws_alpha");
    assert.ok(result.citations.length > 0);
    assert.ok(result.citations.every((item) => item.chunkId === "chunk_alpha"));
    assert.equal(result.needsLeadCapture, false);
  } finally {
    await stack.cleanup();
  }
});

test("integration: empty knowledge base returns honest no-hit result", async () => {
  const stack = await createPlatformTestStack();
  try {
    await stack.ragService.upsertBot({
      id: "bot_empty",
      workspaceId: "ws_empty",
      name: "Empty Bot",
      status: "active",
      knowledgeBaseIds: [],
    });

    const result = await stack.ragService.search({
      workspaceId: "ws_empty",
      botId: "bot_empty",
      query: "any question",
    });

    assert.deepEqual(result.citations, []);
    assert.equal(result.needsLeadCapture, true);
    assert.equal(result.retrievalScore, null);
  } finally {
    await stack.cleanup();
  }
});

test("integration: low-score query misses and requests lead capture", async () => {
  const stack = await createPlatformTestStack();
  try {
    await seedWorkspaceBotWithChunk({
      stack,
      workspaceId: "ws_low",
      botId: "bot_low",
      knowledgeBaseId: "kb_low",
      chunkId: "chunk_low",
      content: "accounting ledger reconciliation policy",
    });

    const result = await stack.ragService.search({
      workspaceId: "ws_low",
      botId: "bot_low",
      query: "quantum underwater basket weaving",
    });

    assert.deepEqual(result.citations, []);
    assert.equal(result.needsLeadCapture, true);
    assert.ok(result.retrievalScore === null || result.retrievalScore < 0.55);
  } finally {
    await stack.cleanup();
  }
});

test("integration: garbled chunk is ignored in favor of readable Chinese chunk", async () => {
  const stack = await createPlatformTestStack();
  try {
    await seedWorkspaceBotWithChunk({
      stack,
      workspaceId: "ws_cn",
      botId: "bot_cn",
      knowledgeBaseId: "kb_cn",
      chunkId: "chunk_good",
      content: "机柜系列支持非标尺寸扩展，并可根据现场环境做选型建议。",
      foreignChunk: {
        workspaceId: "ws_cn",
        chunkId: "chunk_noise",
        content: "���E\x14P\x01E\x14P\x01E\x14P\x01E\x14P",
      },
    });

    const result = await stack.ragService.search({
      workspaceId: "ws_cn",
      botId: "bot_cn",
      query: "机柜系列怎么选型",
    });

    assert.equal(result.needsLeadCapture, false);
    assert.ok(result.citations.length > 0);
    assert.equal(result.citations[0]?.chunkId, "chunk_good");
  } finally {
    await stack.cleanup();
  }
});

test("integration: strong Chinese keyword overlap can pass simple fallback threshold", async () => {
  const stack = await createPlatformTestStack();
  try {
    await seedWorkspaceBotWithChunk({
      stack,
      workspaceId: "ws_keyword",
      botId: "bot_keyword",
      knowledgeBaseId: "kb_keyword",
      chunkId: "chunk_keyword",
      content: "机柜系列支持非标选型、尺寸扩展和现场工况建议。",
    });

    const result = await stack.ragService.search({
      workspaceId: "ws_keyword",
      botId: "bot_keyword",
      query: "机柜系列怎么选型",
    });

    assert.equal(result.needsLeadCapture, false);
    assert.ok(result.citations.length > 0);
    assert.equal(result.citations[0]?.chunkId, "chunk_keyword");
  } finally {
    await stack.cleanup();
  }
});

test("integration: qdrant health and reconcile flow works with mocked vector store", async () => {
  const previousFetch = globalThis.fetch;
  const fetchCalls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const normalizedUrl = String(url);
    fetchCalls.push(normalizedUrl);

    if (normalizedUrl.endsWith("/collections/qiyun_chunks")) {
      return new Response(JSON.stringify({ result: {} }), { status: 200 });
    }

    if (normalizedUrl.endsWith("/collections/qiyun_chunks/points/scroll")) {
      return new Response(
        JSON.stringify({
          result: {
            points: [{ id: "stale", payload: { chunkId: "chunk_stale" } }],
            next_page_offset: null,
          },
        }),
        { status: 200 },
      );
    }

    if (normalizedUrl.endsWith("/collections/qiyun_chunks/points/delete")) {
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }

    if (normalizedUrl.endsWith("/collections/qiyun_chunks/points") && init?.method === "PUT") {
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
  }) as typeof fetch;

  const ragRepository = new InMemoryRagRepository();
  const stack = await createPlatformTestStack({
    ragRepository,
    vectorStore: new DegradingVectorStore(
      createMockedQdrantVectorStore(),
      new InMemoryQdrantStore(() => ragRepository.listAllChunks()),
    ),
  });

  try {
    const embedding = await new SimpleEmbeddingProvider().embedQuery("integration reconcile chunk");
    await stack.ragRepository.createChunk({
      id: "chunk_live",
      workspaceId: "ws_reconcile",
      knowledgeBaseId: "kb_reconcile",
      documentId: "doc_reconcile",
      documentTitle: "reconcile.md",
      content: "integration reconcile chunk",
      sectionTitle: null,
      chunkIndex: 0,
      embedding,
    });

    const health = await stack.ragService.getVectorStoreHealth();
    assert.equal(health.driver, "qdrant");
    assert.equal(health.status, "ok");

    const snapshot = await stack.ragService.syncStoredChunks();
    assert.equal(snapshot.reconcile.status, "synced");
    assert.equal(snapshot.reconcile.deleted, 1);
    assert.equal(snapshot.workspaceSummary[0]?.workspaceId, "ws_reconcile");

    const unifiedHealth = await buildHealthSnapshotForStack(stack);
    assert.equal(unifiedHealth.services.length, 6);
    assert.equal(unifiedHealth.checks.vectorStore.status, "ok");
    assert.equal(unifiedHealth.checks.embeddingProvider.status, "ok");
    assert.ok(fetchCalls.some((url) => url.includes("/points/scroll")));
  } finally {
    globalThis.fetch = previousFetch;
    await stack.cleanup();
  }
});

test("integration: dead-letter queue remains workspace scoped", async () => {
  process.env.NODE_ENV = "test";
  resetDocumentDeadLetterQueueForTests();
  seedDeadLetterJobForTests(deadLetterJob({ jobId: "dlq_ws_a", workspaceId: "ws_a" }));
  seedDeadLetterJobForTests(deadLetterJob({ jobId: "dlq_ws_b", workspaceId: "ws_b" }));

  const scoped = await listDeadLetterDocumentJobs("ws_a");
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0]?.jobId, "dlq_ws_a");

  const requeued = await requeueDeadLetterDocumentJob("dlq_ws_a", "ws_a");
  assert.equal(requeued.requeued.attempts, 0);
  assert.equal((await getDeadLetterDocumentJob("dlq_ws_a", "ws_a")), null);
  assert.ok(await getDeadLetterDocumentJob("dlq_ws_b", "ws_b"));
});

test(
  "integration live: postgres is reachable",
  { skip: !liveIntegrationEnabled || !process.env.DATABASE_URL },
  async () => {
    assert.equal(await probeLivePostgres(), true);
  },
);

test(
  "integration live: redis is reachable",
  { skip: !liveIntegrationEnabled || !process.env.REDIS_URL },
  async () => {
    assert.equal(await probeLiveRedis(), true);
  },
);

test(
  "integration live: qdrant health check passes",
  { skip: !liveIntegrationEnabled || !process.env.QDRANT_URL },
  async () => {
    assert.equal(await probeLiveQdrant(), true);
  },
);

test(
  "integration live: minio saves, reads, and removes an object",
  { skip: !liveIntegrationEnabled || !process.env.MINIO_ENDPOINT },
  async () => {
    const storage = createDocumentStorage();
    const health = await storage.healthCheck();
    assert.equal(health.status, "ok");
    const expected = new TextEncoder().encode(`qiyun-minio-live-${Date.now()}`);
    const stored = await storage.save({
      workspaceId: "integration-live",
      knowledgeBaseId: "storage-probe",
      fileName: "probe.txt",
      contentBytes: expected,
    });
    try {
      assert.deepEqual(await storage.read(stored.storageKey, "integration-live"), expected);
    } finally {
      await storage.remove(stored.storageKey, "delete");
    }
  },
);
