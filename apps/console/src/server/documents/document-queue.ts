import type { DocumentIndexJob, QueueLike } from "./document.types";
import { processDocumentJob } from "./document-processor";
import type { DocumentService } from "./document.service";
import type { DocumentRecord } from "./document.types";

const STEP_DELAY_MS = 650;

export type DocumentReadyHandler = (document: DocumentRecord) => void;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createProcessingQueue(
  getService: () => DocumentService,
  onDocumentReady?: DocumentReadyHandler,
): QueueLike {
  const jobs: DocumentIndexJob[] = [];

  return {
    enqueue(job) {
      jobs.push(job);
      void runJob(getService, job, onDocumentReady);
    },
    list() {
      return [...jobs];
    },
    clear() {
      jobs.length = 0;
    },
  };
}

async function runJob(
  getService: () => DocumentService,
  job: DocumentIndexJob,
  onDocumentReady?: DocumentReadyHandler,
): Promise<void> {
  const result = processDocumentJob({
    documentId: job.documentId,
    workspaceId: job.workspaceId,
    knowledgeBaseId: job.knowledgeBaseId,
    filename: job.fileName,
    sizeBytes: job.sizeBytes,
    storageKey: job.storageKey,
    attempt: job.attempts,
  });

  for (const transition of result.transitions.slice(1)) {
    await delay(STEP_DELAY_MS);
    const updated = getService().applyWorkerStatus({
      workspaceId: job.workspaceId,
      documentId: job.documentId,
      status: transition.status,
      chunkCount: transition.chunkCount ?? null,
      errorMessage: transition.errorMessage ?? null,
      errorCode: transition.errorCode ?? null,
    });

    if (updated?.status === "ready" && onDocumentReady) {
      onDocumentReady(updated);
    }
  }
}
