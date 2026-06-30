import * as assert from "node:assert/strict";
import { test } from "node:test";

import { InMemoryDocumentQueue } from "./document.queue";
import { InMemoryDocumentRepository } from "./document.repository";
import { DocumentValidationError, DocumentService } from "./document.service";

function createService() {
  const repository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const service = new DocumentService(repository, queue);
  return { queue, repository, service };
}

test("knowledge bases can be listed with document statistics", () => {
  const { service } = createService();
  const knowledgeBase = service.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Product Docs",
  });

  const [uploaded] = service.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    files: [{ fileName: "overview.pdf", fileType: "application/pdf", sizeBytes: 1024 }],
  });

  service.applyWorkerStatus({
    workspaceId: "ws_alpha",
    documentId: uploaded.id,
    status: "ready",
    chunkCount: 3,
  });

  const [summary] = service.listKnowledgeBases("ws_alpha");

  assert.equal(summary.documentCount, 1);
  assert.equal(summary.readyDocumentCount, 1);
  assert.equal(summary.failedDocumentCount, 0);
});

test("knowledge base name must be unique within workspace", () => {
  const { service } = createService();
  service.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Pricing",
  });

  assert.throws(
    () =>
      service.createKnowledgeBase({
        workspaceId: "ws_alpha",
        name: " pricing ",
      }),
    DocumentValidationError,
  );
});

test("knowledge base can be updated and soft deleted", () => {
  const { service } = createService();
  const knowledgeBase = service.createKnowledgeBase({
    workspaceId: "ws_alpha",
    name: "Legacy Docs",
  });

  service.uploadDocuments({
    workspaceId: "ws_alpha",
    knowledgeBaseId: knowledgeBase.id,
    files: [{ fileName: "legacy.txt", fileType: "text/plain", sizeBytes: 512 }],
  });

  const updated = service.updateKnowledgeBase("ws_alpha", knowledgeBase.id, {
    name: "Latest Docs",
    status: "disabled",
  });

  assert.equal(updated.name, "Latest Docs");
  assert.equal(updated.status, "disabled");

  const deleted = service.deleteKnowledgeBase("ws_alpha", knowledgeBase.id);

  assert.equal(deleted.id, knowledgeBase.id);
  assert.equal(deleted.documentCount, 1);
  assert.equal(service.listKnowledgeBases("ws_alpha").length, 0);
});
