import type { DocumentDeadLetterJob, DocumentIndexJob } from "./document.types";
import { getRedisClient } from "../queue/redis";

export const DOCUMENT_DEAD_LETTER_QUEUE_KEY = "qiyun:document-jobs:dead-letter";
export const DOCUMENT_QUEUE_KEY = "qiyun:document-jobs";

function getDocumentQueueDriver(): "inline" | "redis" {
  return process.env.DOCUMENT_QUEUE_DRIVER === "redis" ? "redis" : "inline";
}

export class DocumentDeadLetterUnavailableError extends Error {}
export class DocumentDeadLetterNotFoundError extends Error {}

export type DeadLetterQueueBackend = "redis" | "memory" | "unavailable";

let memoryDeadLetterJobs: DocumentDeadLetterJob[] = [];
let memoryQueuedJobs: DocumentIndexJob[] = [];

export function getDeadLetterQueueBackend(): DeadLetterQueueBackend {
  if (process.env.NODE_ENV === "test") {
    return "memory";
  }

  return getDocumentQueueDriver() === "redis" ? "redis" : "unavailable";
}

export function resetDocumentDeadLetterQueueForTests(): void {
  memoryDeadLetterJobs = [];
  memoryQueuedJobs = [];
}

export function seedDeadLetterJobForTests(job: DocumentDeadLetterJob): void {
  memoryDeadLetterJobs.push(job);
}

export function listMemoryQueuedJobsForTests(): DocumentIndexJob[] {
  return [...memoryQueuedJobs];
}

function assertDeadLetterQueueAvailable(): DeadLetterQueueBackend {
  const backend = getDeadLetterQueueBackend();
  if (backend === "unavailable") {
    throw new DocumentDeadLetterUnavailableError(
      "Dead-letter queue is only available when DOCUMENT_QUEUE_DRIVER=redis.",
    );
  }
  return backend;
}

function sortDeadLetterJobs(jobs: DocumentDeadLetterJob[]): DocumentDeadLetterJob[] {
  return [...jobs].sort((left, right) => right.failedAt.localeCompare(left.failedAt));
}

async function readAllDeadLetterJobs(): Promise<DocumentDeadLetterJob[]> {
  const backend = getDeadLetterQueueBackend();
  if (backend === "unavailable") {
    return [];
  }

  if (backend === "memory") {
    return [...memoryDeadLetterJobs];
  }

  const client = await getRedisClient();
  const items = await client.lRange(DOCUMENT_DEAD_LETTER_QUEUE_KEY, 0, -1);
  return items
    .map((item) => {
      try {
        return JSON.parse(item) as DocumentDeadLetterJob;
      } catch {
        return null;
      }
    })
    .filter((item): item is DocumentDeadLetterJob => item !== null);
}

async function writeDeadLetterJobs(jobs: DocumentDeadLetterJob[]): Promise<void> {
  const backend = assertDeadLetterQueueAvailable();
  if (backend === "memory") {
    memoryDeadLetterJobs = [...jobs];
    return;
  }

  const client = await getRedisClient();
  const pipeline = client.multi();
  pipeline.del(DOCUMENT_DEAD_LETTER_QUEUE_KEY);
  for (const job of jobs) {
    pipeline.lPush(DOCUMENT_DEAD_LETTER_QUEUE_KEY, JSON.stringify(job));
  }
  await pipeline.exec();
}

async function enqueueDocumentJob(job: DocumentIndexJob): Promise<void> {
  const backend = assertDeadLetterQueueAvailable();
  if (backend === "memory") {
    memoryQueuedJobs.push(job);
    return;
  }

  const client = await getRedisClient();
  await client.lPush(DOCUMENT_QUEUE_KEY, JSON.stringify(job));
}

export async function moveDocumentJobToDeadLetter(
  job: DocumentIndexJob,
  error: unknown,
): Promise<DocumentDeadLetterJob> {
  const deadLetter: DocumentDeadLetterJob = {
    ...job,
    failedAt: new Date().toISOString(),
    errorMessage: error instanceof Error ? error.message : String(error),
  };

  const backend = getDeadLetterQueueBackend();
  if (backend === "unavailable") {
    throw new DocumentDeadLetterUnavailableError(
      "Cannot move jobs to dead-letter queue without Redis driver.",
    );
  }

  if (backend === "memory") {
    memoryDeadLetterJobs.unshift(deadLetter);
    return deadLetter;
  }

  const client = await getRedisClient();
  await client.lPush(DOCUMENT_DEAD_LETTER_QUEUE_KEY, JSON.stringify(deadLetter));
  return deadLetter;
}

export async function listDeadLetterDocumentJobs(
  workspaceId?: string,
): Promise<DocumentDeadLetterJob[]> {
  const jobs = sortDeadLetterJobs(await readAllDeadLetterJobs());
  if (!workspaceId) {
    return jobs;
  }

  return jobs.filter((job) => job.workspaceId === workspaceId);
}

export async function getDeadLetterDocumentJob(
  jobId: string,
  workspaceId: string,
): Promise<DocumentDeadLetterJob | null> {
  const jobs = await listDeadLetterDocumentJobs(workspaceId);
  return jobs.find((job) => job.jobId === jobId) ?? null;
}

export async function removeDeadLetterDocumentJob(
  jobId: string,
  workspaceId: string,
): Promise<DocumentDeadLetterJob> {
  assertDeadLetterQueueAvailable();
  const jobs = await readAllDeadLetterJobs();
  const target = jobs.find((job) => job.jobId === jobId && job.workspaceId === workspaceId);
  if (!target) {
    throw new DocumentDeadLetterNotFoundError("Dead-letter job not found in workspace.");
  }

  await writeDeadLetterJobs(
    jobs.filter((job) => !(job.jobId === jobId && job.workspaceId === workspaceId)),
  );
  return target;
}

export async function requeueDeadLetterDocumentJob(
  jobId: string,
  workspaceId: string,
): Promise<{ deadLetter: DocumentDeadLetterJob; requeued: DocumentIndexJob }> {
  assertDeadLetterQueueAvailable();
  const deadLetter = await removeDeadLetterDocumentJob(jobId, workspaceId);
  const requeued: DocumentIndexJob = {
    jobId: deadLetter.jobId,
    workspaceId: deadLetter.workspaceId,
    knowledgeBaseId: deadLetter.knowledgeBaseId,
    documentId: deadLetter.documentId,
    storageKey: deadLetter.storageKey,
    fileName: deadLetter.fileName,
    fileType: deadLetter.fileType,
    sizeBytes: deadLetter.sizeBytes,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  await enqueueDocumentJob(requeued);
  return { deadLetter, requeued };
}

export async function getDeadLetterQueueSnapshot(workspaceId: string): Promise<{
  backend: DeadLetterQueueBackend;
  available: boolean;
  total: number;
  items: DocumentDeadLetterJob[];
}> {
  const backend = getDeadLetterQueueBackend();
  const items = backend === "unavailable"
    ? []
    : await listDeadLetterDocumentJobs(workspaceId);

  return {
    backend,
    available: backend !== "unavailable",
    total: items.length,
    items,
  };
}
