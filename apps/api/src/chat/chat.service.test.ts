import * as assert from "node:assert/strict";
import { test } from "node:test";

import { InMemoryChatRepository } from "./chat.repository";
import { ChatAccessError, ChatService } from "./chat.service";
import { InMemoryDocumentQueue } from "../documents/document.queue";
import { InMemoryDocumentRepository } from "../documents/document.repository";
import { DocumentService } from "../documents/document.service";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "../rag/rag.providers";
import { InMemoryRagRepository } from "../rag/rag.repository";
import { RagService } from "../rag/rag.service";

function createHarness() {
  const documentRepository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const documents = new DocumentService(documentRepository, queue);
  const ragRepository = new InMemoryRagRepository();
  const vectorStore = new InMemoryQdrantStore(() => ragRepository.listChunks());
  const rag = new RagService(
    ragRepository,
    vectorStore,
    documents,
    new SimpleEmbeddingProvider(),
    0.55,
  );
  const chatRepository = new InMemoryChatRepository();
  const chat = new ChatService(chatRepository, ragRepository, rag);

  return { chat, documents, rag };
}

test("public chat stream emits meta token citations and done events", () => {
  const { chat, documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Support Docs",
  });
  const [document] = documents.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    files: [{ fileName: "warranty.pdf", fileType: "application/pdf", sizeBytes: 2048 }],
  });
  documents.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: document.id,
    status: "ready",
    chunkCount: 1,
  });

  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });

  rag.indexChunk({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    documentId: document.id,
    documentTitle: "Warranty Guide",
    content: "The motor warranty period is 24 months and includes free parts replacement.",
  });

  const site = chat.createSite({
    workspaceId: "ws_alpha",
    botId: bot.id,
    name: "Main Site",
    siteKey: "pk_main_site",
    allowedDomains: ["localhost", "example.com"],
  });

  const result = chat.stream({
    botId: bot.id,
    siteKey: site.siteKey,
    visitorId: "visitor_1",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "What is the motor warranty period?",
  });

  assert.equal(result.events[0]?.event, "meta");
  assert.equal(result.events.at(-1)?.event, "done");
  assert.equal(
    result.events.some((event) => event.event === "token"),
    true,
  );
  const citationsEvent = result.events.find((event) => event.event === "citations");
  assert.equal(citationsEvent?.event, "citations");
  if (citationsEvent?.event === "citations") {
    assert.equal(citationsEvent.data.items.length, 1);
    assert.equal(citationsEvent.data.items[0]?.title, "Warranty Guide");
  }
});

test("public chat stream sets needsLeadCapture on low-confidence retrieval", () => {
  const { chat, documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Sparse Docs",
  });
  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Sales Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });
  const site = chat.createSite({
    workspaceId: "ws_alpha",
    botId: bot.id,
    name: "Main Site",
    siteKey: "pk_low_score",
    allowedDomains: ["localhost"],
  });

  const result = chat.stream({
    botId: bot.id,
    siteKey: site.siteKey,
    visitorId: "visitor_2",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "How long is the motor warranty?",
  });

  const doneEvent = result.events.at(-1);
  assert.equal(doneEvent?.event, "done");
  if (doneEvent?.event === "done") {
    assert.equal(doneEvent.data.needsLeadCapture, true);
  }
});

test("public chat stream rejects origin outside allowlist", () => {
  const { chat, documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Support Docs",
  });
  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });

  chat.createSite({
    workspaceId: "ws_alpha",
    botId: bot.id,
    name: "Main Site",
    siteKey: "pk_restricted",
    allowedDomains: ["example.com"],
  });

  assert.throws(
    () =>
      chat.stream({
        botId: bot.id,
        siteKey: "pk_restricted",
        visitorId: "visitor_3",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "hello",
      }),
    ChatAccessError,
  );
});

test("public lead submission persists lead and conversation detail is queryable", () => {
  const { chat, documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Support Docs",
  });
  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });
  const site = chat.createSite({
    workspaceId: "ws_alpha",
    botId: bot.id,
    name: "Main Site",
    siteKey: "pk_lead",
    allowedDomains: ["localhost"],
  });

  const result = chat.stream({
    botId: bot.id,
    siteKey: site.siteKey,
    visitorId: "visitor_4",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "I need a quote",
  });

  const lead = chat.submitLead({
    botId: bot.id,
    siteKey: site.siteKey,
    conversationId: result.conversation.id,
    fields: {
      name: "Li",
      phone: "13800000000",
      company: "",
    },
  });

  assert.equal(lead.fields.name, "Li");
  assert.equal(lead.fields.phone, "13800000000");
  assert.equal("company" in lead.fields, false);

  const conversations = chat.listConversations("ws_alpha");
  assert.equal(conversations.length, 1);
  assert.equal(conversations[0]?.messageCount, 2);

  const detail = chat.getConversation("ws_alpha", result.conversation.id);
  assert.equal(detail.messages.length, 2);
  assert.equal(detail.messages[0]?.role, "user");
  assert.equal(detail.messages[1]?.role, "assistant");
});
