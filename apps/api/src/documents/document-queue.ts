import { executeDocumentJob } from "./document-job-runner";
import {
  DOCUMENT_QUEUE_KEY,
  moveDocumentJobToDeadLetter,
} from "./document-dead-letter-queue";
import type { DocumentService } from "./document.service";
import type { DocumentStorage } from "./document-storage";
import type {
  DocumentIndexJob,
  QueueLike,
} from "./document.types";
import type { RagService } from "../rag/rag.service";
import { getRedisClient } from "../queue/redis";

export { DOCUMENT_QUEUE_KEY, moveDocumentJobToDeadLetter } from "./document-dead-letter-queue";

export function getDocumentQueueDriver(): "inline" | "redis" {
  return process.env.DOCUMENT_QUEUE_DRIVER === "redis" ? "redis" : "inline";
}

export function getDocumentQueueMaxAttempts(): number {
  const parsed = Number.parseInt(process.env.DOCUMENT_QUEUE_MAX_ATTEMPTS ?? "3", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export function createProcessingQueue(input: {
  getDocumentService: () => DocumentService;
  getRagService: () => RagService;
  storage: DocumentStorage;
  persist?: () => Promise<void>;
}): QueueLike {
  if (getDocumentQueueDriver() === "redis" && process.env.NODE_ENV !== "test") {
    return createRedisQueue();
  }

  return createInlineQueue(input);
}

function createInlineQueue(input: {
  getDocumentService: () => DocumentService;
  getRagService: () => RagService;
  storage: DocumentStorage;
  persist?: () => Promise<void>;
}): QueueLike {
  const jobs: DocumentIndexJob[] = [];

  return {
    async enqueue(job) {
      jobs.push(job);
      await executeDocumentJob({
        job,
        documentService: input.getDocumentService(),
        ragService: input.getRagService(),
        storage: input.storage,
        persist: input.persist,
      });
    },
    async list() {
      return [...jobs];
    },
    async clear() {
      jobs.length = 0;
    },
  };
}

function createRedisQueue(): QueueLike {
  return {
    async enqueue(job) {
      const client = await getRedisClient();
      await client.lPush(DOCUMENT_QUEUE_KEY, JSON.stringify(job));
    },
    async list() {
      const client = await getRedisClient();
      const items = await client.lRange(DOCUMENT_QUEUE_KEY, 0, -1);
      return items
        .map((item) => {
          try {
            return JSON.parse(item) as DocumentIndexJob;
          } catch {
            return null;
          }
        })
        .filter((item): item is DocumentIndexJob => item !== null);
    },
    async clear() {
      const client = await getRedisClient();
      await client.del(DOCUMENT_QUEUE_KEY);
    },
  };
}

export async function dequeueDocumentJobBlocking(): Promise<DocumentIndexJob> {
  const client = await getRedisClient();
  const result = await client.brPop(DOCUMENT_QUEUE_KEY, 0);
  const raw = Array.isArray(result) ? result[1] : result?.element;

  if (!raw) {
    throw new Error("Redis queue returned no document job.");
  }

  return JSON.parse(raw) as DocumentIndexJob;
}

export async function requeueDocumentJob(
  job: DocumentIndexJob,
): Promise<DocumentIndexJob> {
  const nextJob: DocumentIndexJob = {
    ...job,
    attempts: job.attempts + 1,
    queuedAt: new Date().toISOString(),
  };
  const client = await getRedisClient();
  await client.lPush(DOCUMENT_QUEUE_KEY, JSON.stringify(nextJob));
  return nextJob;
}
