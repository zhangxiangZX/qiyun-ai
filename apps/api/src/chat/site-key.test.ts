import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryChatRepository } from "./chat.repository";
import { ChatService } from "./chat.service";
import { InMemoryRagRepository } from "../rag/rag.repository";
import { RagService } from "../rag/rag.service";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "../rag/rag.providers";
import { InMemoryDocumentRepository } from "../documents/document.repository";
import { DocumentService } from "../documents/document.service";
import type { QueueLike } from "../documents/document.types";

function createChatService() {
  const ragRepository = new InMemoryRagRepository();
  const documentRepository = new InMemoryDocumentRepository();
  const queue: QueueLike = {
    async enqueue() {},
    async list() {
      return [];
    },
    async clear() {},
  };
  const storage = {
    async save() {
      return {
        storageKey: "memory",
        sizeBytes: 0,
      };
    },
    async read() {
      return new Uint8Array();
    },
    async remove() {
      return {
        action: "deleted" as const,
        archivedStorageKey: null,
      };
    },
    async healthCheck() {
      return {
        status: "ok" as const,
        driver: "local" as const,
        detail: "memory",
      };
    },
  };
  const documentService = new DocumentService(
    documentRepository,
    queue,
    storage,
  );
  const ragService = new RagService(
    ragRepository,
    new InMemoryQdrantStore(() => ragRepository.listChunks()),
    documentService,
    new SimpleEmbeddingProvider(),
  );
  const chatRepository = new InMemoryChatRepository();
  const chatService = new ChatService(chatRepository, ragRepository, ragService, storage, null);

  return { chatService, ragService };
}

test("site key rotation reveals once and invalidates the previous key", async () => {
  const { chatService, ragService } = createChatService();
  const workspaceId = "ws_site";

  await ragService.upsertBot({
    id: "bot_site",
    workspaceId,
    name: "Site Bot",
    status: "active",
    knowledgeBaseIds: [],
  });

  const created = await chatService.createSite({
    workspaceId,
    botId: "bot_site",
    name: "Main Site",
    allowedDomains: ["localhost"],
  });

  const listed = await chatService.listSites(workspaceId);
  assert.equal(listed[0]?.siteKeyPrefix, created.site.siteKeyPrefix);
  assert.equal("revealedSiteKey" in (listed[0] as object), false);

  const firstResponse = await chatService.stream({
    botId: "bot_site",
    siteKey: created.revealedSiteKey,
    visitorId: "visitor-1",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "hello",
  });
  assert.equal(firstResponse.conversation.botId, "bot_site");
  const firstDoneEvent = firstResponse.events.find((event) => event.event === "done");
  assert.equal(Array.isArray(firstDoneEvent?.data.suggestedQuestions), true);
  assert.equal((firstDoneEvent?.data.suggestedQuestions ?? []).length > 0, true);

  const rotated = await chatService.rotateSiteKey(workspaceId, created.site.id);
  assert.notEqual(rotated.revealedSiteKey, created.revealedSiteKey);
  assert.notEqual(rotated.site.siteKeyPrefix, created.site.siteKeyPrefix);

  await assert.rejects(
    () =>
      chatService.stream({
        botId: "bot_site",
        siteKey: created.revealedSiteKey,
        visitorId: "visitor-old",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "old key",
      }),
    /Site not found/i,
  );

  const secondResponse = await chatService.stream({
    botId: "bot_site",
    siteKey: rotated.revealedSiteKey,
    visitorId: "visitor-2",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "new key",
  });
  assert.equal(secondResponse.conversation.botId, "bot_site");
});

test("site origin check rejects hostname substring bypass attempts", async () => {
  const { chatService, ragService } = createChatService();
  const workspaceId = "ws_site_origin";

  await ragService.upsertBot({
    id: "bot_origin",
    workspaceId,
    name: "Origin Bot",
    status: "active",
    knowledgeBaseIds: [],
  });

  const created = await chatService.createSite({
    workspaceId,
    botId: "bot_origin",
    name: "Protected Site",
    allowedDomains: ["example.com"],
  });

  await assert.rejects(
    () =>
      chatService.stream({
        botId: "bot_origin",
        siteKey: created.revealedSiteKey,
        visitorId: "visitor-origin-bypass",
        sdkVersion: "1.0.0",
        origin: "https://example.com.evil.org",
        message: "hello",
      }),
    /当前域名未授权|not allowed|not found|unauthorized/i,
  );
});
