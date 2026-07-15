import assert from "node:assert/strict";
import test from "node:test";

import {
  createProcessingQueue,
  dequeueDocumentJobBlocking,
  DOCUMENT_QUEUE_KEY,
  getDocumentQueueBlockTimeoutSeconds,
  requeueDocumentJob,
} from "./document-queue";
import type { DocumentIndexJob } from "./document.types";
import { setRedisClientFactoryForTests } from "../queue/redis";

type StoredValue = string;

class FakeRedisClient {
  private readonly lists = new Map<string, StoredValue[]>();

  async lPush(key: string, value: StoredValue): Promise<number> {
    const list = this.lists.get(key) ?? [];
    list.unshift(value);
    this.lists.set(key, list);
    return list.length;
  }

  async lRange(key: string, start: number, stop: number): Promise<StoredValue[]> {
    const list = [...(this.lists.get(key) ?? [])];
    const end = stop < 0 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async del(key: string): Promise<number> {
    this.lists.delete(key);
    return 1;
  }

  async brPop(key: string): Promise<{ key: string; element: StoredValue } | null> {
    const list = this.lists.get(key) ?? [];
    const element = list.pop();
    this.lists.set(key, list);
    return element ? { key, element } : null;
  }

  multi() {
    const operations: Array<() => Promise<void>> = [];
    return {
      del: (key: string) => {
        operations.push(async () => {
          await this.del(key);
        });
      },
      lPush: (key: string, value: StoredValue) => {
        operations.push(async () => {
          await this.lPush(key, value);
        });
      },
      exec: async () => {
        for (const operation of operations) {
          await operation();
        }
      },
    };
  }
}

function createJob(overrides: Partial<DocumentIndexJob> = {}): DocumentIndexJob {
  return {
    jobId: "job_queue_1",
    workspaceId: "ws_1",
    knowledgeBaseId: "kb_1",
    documentId: "doc_1",
    storageKey: "documents/doc_1.txt",
    fileName: "doc.txt",
    fileType: "text/plain",
    sizeBytes: 10,
    queuedAt: "2026-07-04T00:00:00.000Z",
    attempts: 0,
    ...overrides,
  };
}

test("createProcessingQueue inline driver executes document jobs immediately", async () => {
  process.env.DOCUMENT_QUEUE_DRIVER = "inline";
  process.env.NODE_ENV = "test";

  const queue = createProcessingQueue({
    getDocumentService: () =>
      ({
        applyWorkerStatus: async (input: {
          workspaceId: string;
          documentId: string;
          status: "uploaded" | "parsing" | "indexing" | "ready" | "failed";
          chunkCount?: number | null;
          errorCode?: string | null;
          errorMessage?: string | null;
        }) => ({
          id: input.documentId,
          workspaceId: input.workspaceId,
          knowledgeBaseId: "kb_1",
          fileName: "doc.txt",
          fileType: "text/plain",
          storageKey: "documents/doc_1.txt",
          sizeBytes: 10,
          status: input.status,
          chunkCount: input.chunkCount ?? null,
          errorCode: input.errorCode ?? null,
          errorMessage: input.errorMessage ?? null,
          createdAt: "2026-07-04T00:00:00.000Z",
          updatedAt: "2026-07-04T00:00:00.000Z",
          deletedAt: null,
        }),
      }) as never,
    getRagService: () =>
      ({
        replaceDocumentChunks: async () => {},
      }) as never,
    storage: {
      read: async () => new TextEncoder().encode("industrial spec\n\nsecond block"),
    } as never,
    persist: async () => {},
  });

  await queue.enqueue(createJob());
  const listed = await queue.list();

  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.documentId, "doc_1");
});

test("redis queue helpers enqueue, list, dequeue, and requeue jobs", async () => {
  const previousDriver = process.env.DOCUMENT_QUEUE_DRIVER;
  const previousNodeEnv = process.env.NODE_ENV;
  const client = new FakeRedisClient();
  setRedisClientFactoryForTests(async () => client as never);
  process.env.DOCUMENT_QUEUE_DRIVER = "redis";
  process.env.NODE_ENV = "development";

  try {
    const queue = createProcessingQueue({
      getDocumentService: () => ({}) as never,
      getRagService: () => ({}) as never,
      storage: {} as never,
    });
    const job = createJob();

    await queue.enqueue(job);
    const queued = await queue.list();
    assert.equal(queued.length, 1);
    assert.equal(queued[0]?.documentId, "doc_1");

    const dequeued = await dequeueDocumentJobBlocking();
    assert.ok(dequeued);
    assert.equal(dequeued.documentId, "doc_1");

    const retried = await requeueDocumentJob(dequeued);
    assert.equal(retried.attempts, 1);

    const raw = await client.lRange(DOCUMENT_QUEUE_KEY, 0, -1);
    assert.equal(raw.length, 1);
    const parsed = JSON.parse(raw[0] ?? "{}") as DocumentIndexJob;
    assert.equal(parsed.attempts, 1);

    await queue.clear();
    assert.deepEqual(await queue.list(), []);
  } finally {
    setRedisClientFactoryForTests(undefined);
    if (previousDriver === undefined) delete process.env.DOCUMENT_QUEUE_DRIVER;
    else process.env.DOCUMENT_QUEUE_DRIVER = previousDriver;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("redis queue dequeue returns null after timeout when queue is empty", async () => {
  const previousDriver = process.env.DOCUMENT_QUEUE_DRIVER;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTimeout = process.env.DOCUMENT_QUEUE_BLOCK_TIMEOUT_SECONDS;
  const client = new FakeRedisClient();
  setRedisClientFactoryForTests(async () => client as never);
  process.env.DOCUMENT_QUEUE_DRIVER = "redis";
  process.env.NODE_ENV = "development";
  process.env.DOCUMENT_QUEUE_BLOCK_TIMEOUT_SECONDS = "2";

  try {
    assert.equal(getDocumentQueueBlockTimeoutSeconds(), 2);
    const dequeued = await dequeueDocumentJobBlocking();
    assert.equal(dequeued, null);
  } finally {
    setRedisClientFactoryForTests(undefined);
    if (previousDriver === undefined) delete process.env.DOCUMENT_QUEUE_DRIVER;
    else process.env.DOCUMENT_QUEUE_DRIVER = previousDriver;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousTimeout === undefined) delete process.env.DOCUMENT_QUEUE_BLOCK_TIMEOUT_SECONDS;
    else process.env.DOCUMENT_QUEUE_BLOCK_TIMEOUT_SECONDS = previousTimeout;
  }
});
