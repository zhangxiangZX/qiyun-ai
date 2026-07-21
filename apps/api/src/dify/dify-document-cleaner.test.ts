import assert from "node:assert/strict";
import test from "node:test";

import {
  DifyDocumentCleaner,
  createDifyDocumentCleanerFromEnv,
} from "./dify-document-cleaner";

const input = {
  workspaceId: "ws_customer_a",
  documentId: "doc_1",
  fileName: "pump-manual.pdf",
  chunks: [{ content: "  Pump header\n\nModel A pressure 10 bar.  ", sectionTitle: "参数" }],
};

test("Dify cleaner replaces content and scopes requests by workspace", async () => {
  let capturedBody: unknown = null;
  const cleaner = new DifyDocumentCleaner({
    enabled: true,
    baseUrl: "https://api.dify.test/v1/",
    apiKey: "app-test",
    timeoutMs: 1000,
    outputVariable: "cleaned_text",
    failOpen: true,
    fetchImpl: async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        data: { status: "succeeded", outputs: { cleaned_text: "Model A pressure: 10 bar." } },
      }));
    },
  });

  const result = await cleaner.cleanChunks(input);
  const requestBody = capturedBody as { user?: string };

  assert.equal(result[0]?.content, "Model A pressure: 10 bar.");
  assert.equal(result[0]?.sectionTitle, "参数");
  assert.equal(requestBody.user, "qiyun:ws_customer_a");
});

test("Dify cleaner fails open when the workflow is unavailable", async () => {
  const cleaner = new DifyDocumentCleaner({
    enabled: true,
    baseUrl: "https://api.dify.test/v1",
    apiKey: "app-test",
    timeoutMs: 1000,
    outputVariable: "cleaned_text",
    failOpen: true,
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
  });

  assert.deepEqual(await cleaner.cleanChunks(input), input.chunks);
});

test("disabled Dify cleaner does not call the network", async () => {
  let calls = 0;
  const cleaner = createDifyDocumentCleanerFromEnv(
    { DIFY_ENABLED: "false" },
    async () => {
      calls += 1;
      return new Response();
    },
  );

  assert.deepEqual(await cleaner.cleanChunks(input), input.chunks);
  assert.equal(calls, 0);
});

test("strict Dify cleaner rejects invalid workflow output", async () => {
  const cleaner = new DifyDocumentCleaner({
    enabled: true,
    baseUrl: "https://api.dify.test/v1",
    apiKey: "app-test",
    timeoutMs: 1000,
    outputVariable: "cleaned_text",
    failOpen: false,
    fetchImpl: async () => new Response(JSON.stringify({ data: { status: "succeeded", outputs: {} } })),
  });

  await assert.rejects(() => cleaner.cleanChunks(input), /missing or empty/i);
});
