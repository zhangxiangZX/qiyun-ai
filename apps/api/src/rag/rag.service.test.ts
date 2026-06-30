import * as assert from "node:assert/strict";
import { test } from "node:test";

import { InMemoryDocumentQueue } from "../documents/document.queue";
import { InMemoryDocumentRepository } from "../documents/document.repository";
import { DocumentService } from "../documents/document.service";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "./rag.providers";
import { InMemoryRagRepository } from "./rag.repository";
import { RagAccessError, RagService } from "./rag.service";

function createHarness() {
  const documentRepository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const documents = new DocumentService(documentRepository, queue);
  const ragRepository = new InMemoryRagRepository();
  const embeddingProvider = new SimpleEmbeddingProvider();
  const vectorStore = new InMemoryQdrantStore(() => ragRepository.listChunks());
  const rag = new RagService(ragRepository, vectorStore, documents, embeddingProvider, 0.55);

  return { documents, rag };
}

test("retrieval enforces workspace isolation", () => {
  const { documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Alpha Docs",
  });
  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });

  assert.throws(
    () =>
      rag.search({
        workspaceId: "ws_beta",
        botId: bot.id,
        query: "pricing details",
      }),
    RagAccessError,
  );
});

test("empty knowledge base returns needsLeadCapture", () => {
  const { documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Empty Docs",
  });
  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Sales Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });

  const result = rag.search({
    workspaceId: "ws_alpha",
    botId: bot.id,
    query: "What is the warranty period?",
  });

  assert.equal(result.needsLeadCapture, true);
  assert.equal(result.citations.length, 0);
  assert.equal(result.retrievalScore, null);
});

test("low score retrieval returns information-insufficient result", () => {
  const { documents, rag } = createHarness();
  const knowledgeBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Product Docs",
  });
  const [document] = documents.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    files: [{ fileName: "delivery.pdf", fileType: "application/pdf", sizeBytes: 1024 }],
  });

  documents.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: document.id,
    status: "ready",
    chunkCount: 1,
  });

  rag.indexChunk({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    documentId: document.id,
    documentTitle: "Delivery Policy",
    content: "Logistics dispatch times are reviewed every Friday for warehouse balancing.",
  });

  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [knowledgeBase.id],
  });

  const result = rag.search({
    workspaceId: "ws_alpha",
    botId: bot.id,
    query: "How long is the motor warranty?",
  });

  assert.equal(result.needsLeadCapture, true);
  assert.equal(result.citations.length, 0);
  assert.ok((result.retrievalScore ?? 0) < 0.55);
});

test("successful retrieval returns top citations in knowledge-base scope", () => {
  const { documents, rag } = createHarness();
  const productBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Product Docs",
  });
  const hrBase = documents.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "HR Docs",
  });

  const [productDocument] = documents.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: productBase.id,
    files: [{ fileName: "warranty.pdf", fileType: "application/pdf", sizeBytes: 1024 }],
  });
  const [hrDocument] = documents.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: hrBase.id,
    files: [{ fileName: "holiday.pdf", fileType: "application/pdf", sizeBytes: 1024 }],
  });

  documents.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: productDocument.id,
    status: "ready",
    chunkCount: 2,
  });
  documents.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: hrDocument.id,
    status: "ready",
    chunkCount: 1,
  });

  rag.indexChunk({
    workspaceId: "ws_alpha",
    knowledgeBaseId: productBase.id,
    documentId: productDocument.id,
    documentTitle: "Warranty Guide",
    content: "The motor warranty period is 24 months and includes free parts replacement.",
  });
  rag.indexChunk({
    workspaceId: "ws_alpha",
    knowledgeBaseId: hrBase.id,
    documentId: hrDocument.id,
    documentTitle: "Holiday Policy",
    content: "Annual leave rules are reviewed every January by the HR team.",
  });

  const bot = rag.createBot({
    workspaceId: "ws_alpha",
    name: "Support Bot",
    knowledgeBaseIds: [productBase.id],
  });

  const result = rag.search({
    workspaceId: "ws_alpha",
    botId: bot.id,
    query: "What is the motor warranty period?",
  });

  assert.equal(result.needsLeadCapture, false);
  assert.equal(result.citations.length, 1);
  assert.equal(result.citations[0]?.title, "Warranty Guide");
  assert.match(result.contextBlocks[0] ?? "", /motor warranty period/i);
  assert.ok((result.retrievalScore ?? 0) >= 0.55);
});
