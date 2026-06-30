import * as assert from "node:assert/strict";
import { test } from "node:test";

import { InMemoryDocumentQueue } from "./document.queue";
import { InMemoryDocumentRepository } from "./document.repository";
import { DocumentAccessError, DocumentService } from "./document.service";

function createService() {
  const repository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const service = new DocumentService(repository, queue);
  return { queue, service };
}

test("upload keeps workspace isolation", () => {
  const { service } = createService();
  const kb = service.createKnowledgeBase({ workspaceId: "ws_alpha", name: "Support" });

  assert.throws(
    () =>
      service.uploadDocuments({
        workspaceId: "ws_beta",
        knowledgeBaseId: kb.id,
        files: [{ fileName: "faq.pdf", fileType: ".pdf", sizeBytes: 100 }],
      }),
    DocumentAccessError,
  );
});

test("upload creates uploaded documents and enqueues jobs", () => {
  const { queue, service } = createService();
  const kb = service.createKnowledgeBase({ workspaceId: "ws_alpha", name: "Support" });

  const documents = service.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: kb.id,
    files: [
      { fileName: "faq.pdf", fileType: ".pdf", sizeBytes: 1024 },
      { fileName: "pricing.md", fileType: ".md", sizeBytes: 256 },
    ],
  });

  assert.equal(documents.length, 2);
  assert.equal(documents[0]?.status, "uploaded");
  assert.equal(queue.list().length, 2);
});

test("knowledge base can start with no documents", () => {
  const { service } = createService();
  const kb = service.createKnowledgeBase({ workspaceId: "ws_alpha", name: "Support" });

  const documents = service.listKnowledgeBaseDocuments("ws_alpha", kb.id);
  assert.equal(documents.length, 0);
});

test("reindex resets failed document and requeues it", () => {
  const { queue, service } = createService();
  const kb = service.createKnowledgeBase({ workspaceId: "ws_alpha", name: "Support" });
  const [document] = service.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: kb.id,
    files: [{ fileName: "broken.pdf", fileType: ".pdf", sizeBytes: 2048 }],
  });

  service.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: document!.id,
    status: "failed",
    errorMessage: "parser failed",
  });

  queue.clear();
  const updated = service.reindexDocument("ws_alpha", document!.id);

  assert.equal(updated.status, "uploaded");
  assert.equal(updated.errorMessage, null);
  assert.equal(queue.list().length, 1);
});
