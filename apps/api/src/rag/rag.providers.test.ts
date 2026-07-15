import assert from "node:assert/strict";
import test from "node:test";

import {
  DegradingEmbeddingProvider,
  keywordOverlapScore,
  OpenAICompatibleEmbeddingProvider,
  QdrantVectorStore,
  SimpleEmbeddingProvider,
} from "./rag.providers";
import type { ChunkRecord } from "./rag.types";

test("qdrant reconcileChunks deletes stale points and upserts current chunks", async () => {
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  const chunks: ChunkRecord[] = [
    {
      id: "chunk_live_1",
      workspaceId: "ws_1",
      knowledgeBaseId: "kb_1",
      documentId: "doc_1",
      documentTitle: "Doc 1",
      content: "hello world",
      sectionTitle: null,
      chunkIndex: null,
      embedding: [0.1, 0.2],
    },
  ];

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const normalizedUrl = String(url);
    fetchCalls.push({ url: normalizedUrl, init });

    if (normalizedUrl.endsWith("/collections/qiyun_chunks")) {
      return new Response(JSON.stringify({ result: {} }), { status: 200 });
    }

    if (normalizedUrl.endsWith("/collections/qiyun_chunks/points/scroll")) {
      return new Response(
        JSON.stringify({
          result: {
            points: [
              { id: "stale_1", payload: { chunkId: "chunk_stale_1" } },
              { id: "live_1", payload: { chunkId: "chunk_live_1" } },
            ],
            next_page_offset: null,
          },
        }),
        { status: 200 },
      );
    }

    if (
      normalizedUrl.endsWith("/collections/qiyun_chunks/points/delete")
      && init?.body?.toString().includes('"points":["stale_1"]')
    ) {
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }

    if (
      normalizedUrl.endsWith("/collections/qiyun_chunks/points")
      && init?.method === "PUT"
    ) {
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
  }) as typeof fetch;

  try {
    const store = new QdrantVectorStore({
      baseUrl: "http://qdrant:6333",
      collectionName: "qiyun_chunks",
      dimensions: 2,
    });

    const result = await store.reconcileChunks(chunks);

    assert.equal(result.total, 1);
    assert.equal(result.upserted, 1);
    assert.equal(result.deleted, 1);
    assert.equal(result.status, "synced");
    assert.equal(result.attempts, 1);

    const deleteCall = fetchCalls.find((call) =>
      call.url.endsWith("/collections/qiyun_chunks/points/delete")
      && call.init?.body?.toString().includes('"points":["stale_1"]'),
    );
    assert.ok(deleteCall);

    const upsertCall = fetchCalls.find((call) =>
      call.url.endsWith("/collections/qiyun_chunks/points")
      && call.init?.method === "PUT",
    );
    assert.ok(upsertCall);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("qdrant reconcileChunks returns degraded after retries are exhausted", async () => {
  let scrollCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const normalizedUrl = String(url);

    if (normalizedUrl.endsWith("/collections/qiyun_chunks")) {
      return new Response(JSON.stringify({ result: {} }), { status: 200 });
    }

    if (normalizedUrl.endsWith("/collections/qiyun_chunks/points/scroll")) {
      scrollCalls += 1;
      return new Response(JSON.stringify({ error: "scroll failed" }), { status: 500 });
    }

    return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
  }) as typeof fetch;

  const previousAttempts = process.env.VECTOR_RECONCILE_MAX_ATTEMPTS;
  const previousDelay = process.env.VECTOR_RECONCILE_RETRY_DELAY_MS;
  process.env.VECTOR_RECONCILE_MAX_ATTEMPTS = "2";
  process.env.VECTOR_RECONCILE_RETRY_DELAY_MS = "0";

  try {
    const store = new QdrantVectorStore({
      baseUrl: "http://qdrant:6333",
      collectionName: "qiyun_chunks",
      dimensions: 2,
    });

    const result = await store.reconcileChunks([]);
    assert.equal(result.status, "degraded");
    assert.equal(result.attempts, 2);
    assert.match(result.error ?? "", /status 500/);
    assert.ok(scrollCalls >= 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAttempts === undefined) {
      delete process.env.VECTOR_RECONCILE_MAX_ATTEMPTS;
    } else {
      process.env.VECTOR_RECONCILE_MAX_ATTEMPTS = previousAttempts;
    }
    if (previousDelay === undefined) {
      delete process.env.VECTOR_RECONCILE_RETRY_DELAY_MS;
    } else {
      process.env.VECTOR_RECONCILE_RETRY_DELAY_MS = previousDelay;
    }
  }
});

test("qdrant healthCheck reports ok when collection is reachable", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const normalizedUrl = String(url);

    if (normalizedUrl.endsWith("/collections/qiyun_chunks")) {
      return new Response(JSON.stringify({ result: {} }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
  }) as typeof fetch;

  try {
    const store = new QdrantVectorStore({
      baseUrl: "http://qdrant:6333",
      collectionName: "qiyun_chunks",
      dimensions: 2,
    });

    const result = await store.healthCheck();
    assert.equal(result.driver, "qdrant");
    assert.equal(result.status, "ok");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("openai-compatible embedding provider returns numeric vector", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ embedding: [0.1, "0.2", null, 0.4] }],
      }),
      { status: 200 },
    )) as typeof fetch;

  try {
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: "https://embeddings.example.com/v1",
      apiKey: "test-key",
      model: "text-embedding-3-small",
      expectedDimensions: 4,
    });

    const vector = await provider.embedQuery("hello");
    assert.deepEqual(vector, [0.1, 0.2, 0, 0.4]);

    const health = await provider.healthCheck();
    assert.equal(health.status, "ok");
    assert.equal(health.driver, "openai-compatible");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("openai-compatible embedding provider healthCheck performs a live probe", async () => {
  let calls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: "https://embeddings.example.com/v1",
      apiKey: "test-key",
      model: "text-embedding-3-small",
      expectedDimensions: 3,
    });

    const health = await provider.healthCheck();
    assert.equal(health.status, "ok");
    assert.match(health.detail, /verified/i);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("openai-compatible embedding provider rejects vector dimension mismatch", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ embedding: [0.1, 0.2] }],
      }),
      { status: 200 },
    )) as typeof fetch;

  try {
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: "https://embeddings.example.com/v1",
      apiKey: "test-key",
      model: "text-embedding-3-small",
      expectedDimensions: 3,
    });

    await assert.rejects(() => provider.embedQuery("hello"), /dimension mismatch/i);
    const health = await provider.healthCheck();
    assert.equal(health.status, "error");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("degrading embedding provider falls back to simple embeddings after remote failure", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "boom" }), { status: 500 })) as typeof fetch;

  try {
    const provider = new DegradingEmbeddingProvider(
      new OpenAICompatibleEmbeddingProvider({
        baseUrl: "https://embeddings.example.com/v1",
        apiKey: "test-key",
        model: "text-embedding-3-small",
        timeoutMs: 1000,
      }),
      new SimpleEmbeddingProvider(6),
    );

    const vector = await provider.embedQuery("hello world");
    assert.equal(vector.length, 6);

    const health = await provider.healthCheck();
    assert.equal(health.status, "error");
    assert.match(health.detail, /local embeddings/i);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("simple embedding provider keeps signal for Chinese queries", async () => {
  const provider = new SimpleEmbeddingProvider(32);
  const vector = await provider.embedQuery("机柜系列怎么选型");

  assert.ok(vector.some((value) => value !== 0));
});

test("openai-compatible embedding provider batch embedDocuments returns all vectors", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { input?: string[] };
    assert.deepEqual(body.input, ["alpha", "beta"]);
    return new Response(
      JSON.stringify({
        data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: "https://embeddings.example.com/v1",
      apiKey: "test-key",
      model: "text-embedding-3-small",
      expectedDimensions: 2,
    });

    const vectors = await provider.embedDocuments(["alpha", "beta"]);
    assert.deepEqual(vectors, [
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("keywordOverlapScore matches Chinese content by sub-token overlap", () => {
  const score = keywordOverlapScore("机柜系列怎么选型", "机柜系列支持非标选型和尺寸扩展");

  assert.ok(score > 0);
});
