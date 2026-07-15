import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryDocumentRepository } from "./document.repository";
import { DocumentService } from "./document.service";
import type { DocumentStorage } from "./document-storage";
import type { DocumentIndexJob, QueueLike } from "./document.types";

function createStorageStub(): DocumentStorage {
  return {
    async save() {
      return {
        storageKey: "storage/doc.pdf",
        sizeBytes: 128,
      };
    },
    async read() {
      return new Uint8Array();
    },
    async remove() {
      return {
        action: "deleted",
        archivedStorageKey: null,
      };
    },
    async healthCheck() {
      return {
        status: "ok",
        driver: "local",
        detail: "ok",
      };
    },
  };
}

test("reindexDocument waits for queue enqueue before resolving", async () => {
  const repository = new InMemoryDocumentRepository();
  const queuedJobs: DocumentIndexJob[] = [];
  let releaseEnqueue!: () => void;
  let enqueueResolved = false;

  const queue: QueueLike = {
    enqueue(job) {
      queuedJobs.push(job);
      return new Promise<void>((resolve) => {
        releaseEnqueue = () => {
          enqueueResolved = true;
          resolve();
        };
      });
    },
    async list() {
      return queuedJobs;
    },
    async clear() {
      queuedJobs.length = 0;
    },
  };

  const service = new DocumentService(repository, queue, createStorageStub());

  await repository.createKnowledgeBase({
    id: "kb_1",
    workspaceId: "ws_1",
    name: "知识库",
    status: "active",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
    deletedAt: null,
  });

  await repository.createDocument({
    id: "doc_1",
    workspaceId: "ws_1",
    knowledgeBaseId: "kb_1",
    fileName: "sample.pdf",
    fileType: "application/pdf",
    storageKey: "storage/doc_1.pdf",
    sizeBytes: 128,
    status: "failed",
    chunkCount: 3,
    errorCode: "processing_failed",
    errorMessage: "old failure",
    contentHash: null,
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
    deletedAt: null,
  });

  let completed = false;
  const pending = service.reindexDocument("ws_1", "doc_1").then(() => {
    completed = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(completed, false);
  assert.equal(enqueueResolved, false);
  assert.equal(queuedJobs.length, 1);
  assert.equal(queuedJobs[0]?.documentId, "doc_1");

  releaseEnqueue();
  await pending;

  assert.equal(completed, true);
  assert.equal(enqueueResolved, true);

  const updated = await repository.findDocumentById("ws_1", "doc_1");
  assert.equal(updated?.status, "uploaded");
  assert.equal(updated?.chunkCount, null);
  assert.equal(updated?.errorCode, null);
  assert.equal(updated?.errorMessage, null);
});
