import assert from "node:assert/strict";
import test from "node:test";

import type { DocumentIndexJob } from "../../api/src/documents/document.types";
import {
  bootstrapWorker,
  createWorkerLifecycleController,
  processDocumentJobOnce,
  shouldExitWhenIdle,
  type WorkerDependencies,
} from "./main";

function createJob(overrides: Partial<DocumentIndexJob> = {}): DocumentIndexJob {
  return {
    jobId: "job_1",
    workspaceId: "ws_1",
    knowledgeBaseId: "kb_1",
    documentId: "doc_1",
    storageKey: "docs/doc_1.txt",
    fileName: "doc.txt",
    fileType: "text/plain",
    sizeBytes: 12,
    queuedAt: "2026-07-04T00:00:00.000Z",
    attempts: 0,
    ...overrides,
  };
}

function createDependencies(input?: {
  job?: DocumentIndexJob;
  executeError?: Error;
  maxAttempts?: number;
}): {
  dependencies: WorkerDependencies;
  events: string[];
  requeued: DocumentIndexJob[];
  deadLettered: Array<{ job: DocumentIndexJob; error: unknown }>;
} {
  const job = input?.job ?? createJob();
  const events: string[] = [];
  const requeued: DocumentIndexJob[] = [];
  const deadLettered: Array<{ job: DocumentIndexJob; error: unknown }> = [];

  return {
    events,
    requeued,
    deadLettered,
    dependencies: {
      dequeueJob: async () => job,
      getRuntime: async () => ({
        documentService: {} as never,
        ragService: {} as never,
        documentStorage: {} as never,
        persist: async () => {},
      }),
      executeJob: async ({ job: activeJob }) => {
        if (input?.executeError) {
          throw input.executeError;
        }
        events.push(`executed:${activeJob.documentId}`);
      },
      requeueJob: async (activeJob) => {
        const next = { ...activeJob, attempts: activeJob.attempts + 1 };
        requeued.push(next);
        return next;
      },
      moveToDeadLetter: async (activeJob, error) => {
        deadLettered.push({ job: activeJob, error });
        return {
          ...activeJob,
          failedAt: "2026-07-04T01:00:00.000Z",
          errorMessage: error instanceof Error ? error.message : String(error),
        };
      },
      getMaxAttempts: () => input?.maxAttempts ?? 3,
      writeStdout: (message) => {
        events.push(`stdout:${message}`);
      },
      writeStderr: (message) => {
        events.push(`stderr:${message}`);
      },
    },
  };
}

test("bootstrapWorker exposes readiness text", () => {
  assert.match(bootstrapWorker(), /qiyun-worker runtime is ready/);
});

test("processDocumentJobOnce completes successful document consumption", async () => {
  const { dependencies, events, requeued, deadLettered } = createDependencies();

  const result = await processDocumentJobOnce(1, dependencies);

  assert.equal(result, "processed");
  assert.deepEqual(requeued, []);
  assert.deepEqual(deadLettered, []);
  assert.ok(events.some((entry) => entry === "executed:doc_1"));
  assert.ok(events.some((entry) => entry.includes("Processed doc_1 on attempt 1")));
});

test("processDocumentJobOnce requeues retriable jobs before max attempts", async () => {
  const { dependencies, events, requeued, deadLettered } = createDependencies({
    executeError: new Error("temporary parser outage"),
    maxAttempts: 3,
  });

  const result = await processDocumentJobOnce(2, dependencies);

  assert.equal(result, "retried");
  assert.equal(requeued.length, 1);
  assert.equal(requeued[0]?.attempts, 1);
  assert.equal(deadLettered.length, 0);
  assert.ok(events.some((entry) => entry.includes("Retry 2/3 queued for doc_1")));
});

test("processDocumentJobOnce moves exhausted jobs to dead-letter", async () => {
  const { dependencies, events, requeued, deadLettered } = createDependencies({
    job: createJob({ attempts: 2 }),
    executeError: new Error("permanent corruption"),
    maxAttempts: 3,
  });

  const result = await processDocumentJobOnce(3, dependencies);

  assert.equal(result, "dead-lettered");
  assert.equal(requeued.length, 0);
  assert.equal(deadLettered.length, 1);
  assert.equal(deadLettered[0]?.job.documentId, "doc_1");
  assert.ok(events.some((entry) => entry.includes("Moved doc_1 to dead-letter after 3/3 attempts")));
});

test("processDocumentJobOnce returns idle when no queued job is available", async () => {
  const { dependencies, requeued, deadLettered } = createDependencies();
  dependencies.dequeueJob = async () => null;

  const result = await processDocumentJobOnce(4, dependencies);

  assert.equal(result, "idle");
  assert.deepEqual(requeued, []);
  assert.deepEqual(deadLettered, []);
});

test("worker lifecycle controller transitions to stopping state only once", () => {
  const reasons: string[] = [];
  const controller = createWorkerLifecycleController((reason) => reasons.push(reason));

  assert.equal(controller.isStopping(), false);
  controller.requestStop("SIGTERM");
  controller.requestStop("SIGINT");

  assert.equal(controller.isStopping(), true);
  assert.deepEqual(reasons, ["SIGTERM"]);
});

test("shouldExitWhenIdle reads env flag safely", () => {
  assert.equal(shouldExitWhenIdle({ WORKER_EXIT_WHEN_IDLE: "true" }), true);
  assert.equal(shouldExitWhenIdle({ WORKER_EXIT_WHEN_IDLE: "TRUE" }), true);
  assert.equal(shouldExitWhenIdle({ WORKER_EXIT_WHEN_IDLE: "false" }), false);
  assert.equal(shouldExitWhenIdle({}), false);
});
