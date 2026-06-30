import * as assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import { createApiRuntime } from "../main";
import { createApiServer } from "./api.server";

async function createSeededRuntime() {
  const runtime = createApiRuntime();
  const knowledgeBase = runtime.documentService.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Support Docs",
  });
  const [document] = runtime.documentService.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    files: [{ fileName: "warranty.pdf", fileType: "application/pdf", sizeBytes: 2048 }],
  });

  runtime.documentService.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: document.id,
    status: "ready",
    chunkCount: 1,
  });

  const bot = runtime.ragService.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });

  runtime.ragService.indexChunk({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    documentId: document.id,
    documentTitle: "Warranty Guide",
    content: "The motor warranty period is 24 months and includes free parts replacement.",
  });

  const site = runtime.chatService.createSite({
    workspaceId: "ws_alpha",
    botId: bot.id,
    name: "Main Site",
    siteKey: "pk_http_main",
    allowedDomains: ["localhost"],
  });

  return { bot, runtime, site };
}

test("HTTP server exposes public chat SSE and public leads", async () => {
  const { bot, runtime, site } = await createSeededRuntime();
  const server = createApiServer(runtime);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const streamResponse = await fetch(`${baseUrl}/public/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      botId: bot.id,
      siteKey: site.siteKey,
      visitorId: "visitor_http",
      sdkVersion: "1.0.0",
      origin: "http://localhost:3000",
      message: "What is the motor warranty period?",
    }),
  });

  assert.equal(streamResponse.status, 200);
  assert.match(streamResponse.headers.get("content-type") ?? "", /text\/event-stream/);

  const eventText = await streamResponse.text();
  assert.match(eventText, /event: meta/);
  assert.match(eventText, /event: citations/);
  assert.match(eventText, /event: done/);

  const conversationIdMatch = eventText.match(/"conversationId":"([^"]+)"/);
  assert.ok(conversationIdMatch?.[1]);

  const leadResponse = await fetch(`${baseUrl}/public/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      botId: bot.id,
      siteKey: site.siteKey,
      conversationId: conversationIdMatch?.[1],
      fields: {
        name: "Zhang",
        phone: "13800000000",
      },
    }),
  });

  assert.equal(leadResponse.status, 201);
  const lead = (await leadResponse.json()) as { botId: string; conversationId: string };
  assert.equal(lead.botId, bot.id);

  const conversationsResponse = await fetch(`${baseUrl}/conversations`, {
    headers: { "X-Workspace-Id": "ws_alpha" },
  });

  assert.equal(conversationsResponse.status, 200);
  const conversations = (await conversationsResponse.json()) as Array<{ id: string }>;
  assert.equal(conversations.length, 1);

  server.close();
});
