import assert from "node:assert/strict";
import test from "node:test";

import type { ApiRuntime } from "./runtime";
import { runtimeInternals } from "./runtime";

function createRuntimeStub(input?: {
  bots?: number;
  knowledgeBases?: number;
  sites?: number;
}): ApiRuntime {
  const bots = input?.bots ?? 0;
  const knowledgeBases = input?.knowledgeBases ?? 0;
  const sites = input?.sites ?? 0;

  return {
    driver: "memory",
    ragService: {
      listBots: async () => Array.from({ length: bots }, (_, index) => ({ id: `bot_${index}` })),
    },
    documentService: {
      listKnowledgeBases: async () =>
        Array.from({ length: knowledgeBases }, (_, index) => ({ id: `kb_${index}` })),
    },
    chatService: {
      listSites: async () => Array.from({ length: sites }, (_, index) => ({ id: `site_${index}` })),
    },
    healthCheck: async () => {
      throw new Error("not used");
    },
    persist: async () => {},
  } as unknown as ApiRuntime;
}

test("preview seed defaults to enabled for memory and disabled for postgres", () => {
  assert.equal(runtimeInternals.isPreviewSeedEnabled("memory", {}), true);
  assert.equal(runtimeInternals.isPreviewSeedEnabled("postgres", {}), false);
});

test("preview seed env override is respected", () => {
  assert.equal(
    runtimeInternals.isPreviewSeedEnabled("postgres", { API_SEED_PREVIEW: "true" }),
    true,
  );
  assert.equal(
    runtimeInternals.isPreviewSeedEnabled("memory", { API_SEED_PREVIEW: "false" }),
    false,
  );
});

test("preview seed detects existing runtime data", async () => {
  const emptyRuntime = createRuntimeStub();
  const botSeededRuntime = createRuntimeStub({ bots: 1 });
  const knowledgeBaseSeededRuntime = createRuntimeStub({ knowledgeBases: 1 });
  const siteSeededRuntime = createRuntimeStub({ sites: 1 });

  assert.equal(
    await runtimeInternals.hasPreviewSeedData(emptyRuntime, "ws_dev"),
    false,
  );
  assert.equal(
    await runtimeInternals.hasPreviewSeedData(botSeededRuntime, "ws_dev"),
    true,
  );
  assert.equal(
    await runtimeInternals.hasPreviewSeedData(knowledgeBaseSeededRuntime, "ws_dev"),
    true,
  );
  assert.equal(
    await runtimeInternals.hasPreviewSeedData(siteSeededRuntime, "ws_dev"),
    true,
  );
});

test("embedding provider reuses LLM_API_KEY when dedicated embedding key is absent", async () => {
  const previousEnv = { ...process.env };
  const previousFetch = globalThis.fetch;

  process.env.LLM_PROVIDER = "openai-compatible";
  process.env.LLM_BASE_URL = "https://api.deepseek.com/v1";
  process.env.LLM_API_KEY = "deepseek-chat-key";
  process.env.LLM_EMBEDDING_BASE_URL = "https://api.openai.com/v1";
  process.env.LLM_EMBEDDING_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  process.env.LLM_EMBEDDING_MODEL = "text-embedding-3-small";
  process.env.LLM_EMBEDDING_ENABLED = "true";
  process.env.QDRANT_VECTOR_SIZE = "1536";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ embedding: Array.from({ length: 1536 }, () => 0.1) }],
      }),
      { status: 200 },
    )) as typeof fetch;

  try {
    const provider = runtimeInternals.createEmbeddingProvider();
    const health = await provider.healthCheck();
    assert.equal(health.driver, "openai-compatible");
    assert.equal(health.status, "ok");
  } finally {
    globalThis.fetch = previousFetch;
    process.env = previousEnv;
  }
});

test("embedding provider accepts OPENAI_API_KEY for dedicated remote embeddings", async () => {
  const previousEnv = { ...process.env };
  const previousFetch = globalThis.fetch;

  process.env.LLM_PROVIDER = "openai-compatible";
  process.env.LLM_BASE_URL = "https://api.deepseek.com/v1";
  process.env.LLM_API_KEY = "deepseek-chat-key";
  process.env.LLM_EMBEDDING_BASE_URL = "https://api.openai.com/v1";
  process.env.LLM_EMBEDDING_API_KEY = "";
  process.env.OPENAI_API_KEY = "openai-embed-key";
  process.env.LLM_EMBEDDING_MODEL = "text-embedding-3-small";
  process.env.LLM_EMBEDDING_ENABLED = "true";
  process.env.QDRANT_VECTOR_SIZE = "1536";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ embedding: Array.from({ length: 1536 }, () => 0.1) }],
      }),
      { status: 200 },
    )) as typeof fetch;

  try {
    const provider = runtimeInternals.createEmbeddingProvider();
    const health = await provider.healthCheck();
    assert.equal(health.driver, "openai-compatible");
    assert.equal(health.status, "ok");
  } finally {
    globalThis.fetch = previousFetch;
    process.env = previousEnv;
  }
});
