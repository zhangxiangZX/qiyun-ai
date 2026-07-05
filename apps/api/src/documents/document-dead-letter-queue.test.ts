import assert from "node:assert/strict";
import test from "node:test";

import {
  getDeadLetterDocumentJob,
  listDeadLetterDocumentJobs,
  listMemoryQueuedJobsForTests,
  requeueDeadLetterDocumentJob,
  removeDeadLetterDocumentJob,
  resetDocumentDeadLetterQueueForTests,
  seedDeadLetterJobForTests,
} from "./document-dead-letter-queue";
import type { DocumentDeadLetterJob } from "./document.types";

test.beforeEach(() => {
  process.env.NODE_ENV = "test";
  resetDocumentDeadLetterQueueForTests();
});

function job(
  input: Partial<DocumentDeadLetterJob> & Pick<DocumentDeadLetterJob, "jobId" | "workspaceId">,
): DocumentDeadLetterJob {
  return {
    knowledgeBaseId: "kb_1",
    documentId: "doc_1",
    storageKey: "ws/doc/file",
    fileName: "file.txt",
    fileType: "text/plain",
    sizeBytes: 12,
    queuedAt: "2026-07-01T00:00:00.000Z",
    attempts: 3,
    failedAt: "2026-07-01T01:00:00.000Z",
    errorMessage: "parse failed",
    ...input,
  };
}

test("listDeadLetterDocumentJobs filters by workspace", async () => {
  seedDeadLetterJobForTests(job({ jobId: "job_a", workspaceId: "ws_a" }));
  seedDeadLetterJobForTests(job({ jobId: "job_b", workspaceId: "ws_b" }));

  const scoped = await listDeadLetterDocumentJobs("ws_a");
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0]?.jobId, "job_a");
});

test("getDeadLetterDocumentJob enforces workspace isolation", async () => {
  seedDeadLetterJobForTests(job({ jobId: "job_a", workspaceId: "ws_a" }));

  const found = await getDeadLetterDocumentJob("job_a", "ws_a");
  const missing = await getDeadLetterDocumentJob("job_a", "ws_b");

  assert.equal(found?.jobId, "job_a");
  assert.equal(missing, null);
});

test("requeueDeadLetterDocumentJob moves job back to main queue", async () => {
  seedDeadLetterJobForTests(job({ jobId: "job_retry", workspaceId: "ws_1", attempts: 3 }));

  const result = await requeueDeadLetterDocumentJob("job_retry", "ws_1");
  const remaining = await listDeadLetterDocumentJobs("ws_1");
  const queued = listMemoryQueuedJobsForTests();

  assert.equal(result.requeued.attempts, 0);
  assert.equal(remaining.length, 0);
  assert.equal(queued.length, 1);
  assert.equal(queued[0]?.jobId, "job_retry");
});

test("removeDeadLetterDocumentJob deletes only matching workspace job", async () => {
  seedDeadLetterJobForTests(job({ jobId: "job_a", workspaceId: "ws_a" }));
  seedDeadLetterJobForTests(job({ jobId: "job_b", workspaceId: "ws_b" }));

  const removed = await removeDeadLetterDocumentJob("job_a", "ws_a");
  const remaining = await listDeadLetterDocumentJobs();

  assert.equal(removed.jobId, "job_a");
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0]?.jobId, "job_b");
});

test("listDeadLetterDocumentJobs returns empty list for empty knowledge base queue", async () => {
  const items = await listDeadLetterDocumentJobs("ws_empty");
  assert.deepEqual(items, []);
});
