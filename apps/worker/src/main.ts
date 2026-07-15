import { loadApiEnv } from "../../api/src/config/env";
import {
  dequeueDocumentJobBlocking,
  getDocumentQueueBlockTimeoutSeconds,
  getDocumentQueueMaxAttempts,
  moveDocumentJobToDeadLetter,
  requeueDocumentJob,
} from "../../api/src/documents/document-queue";
import { executeDocumentJob } from "../../api/src/documents/document-job-runner";
import type { DocumentIndexJob } from "../../api/src/documents/document.types";
import { getRuntime } from "../../api/src/runtime";

export const workerName = "qiyun-worker";

type RuntimeSnapshot = Awaited<ReturnType<typeof getRuntime>>;

interface WorkerRuntimeSnapshot {
  documentService: RuntimeSnapshot["documentService"];
  ragService: RuntimeSnapshot["ragService"];
  documentStorage: RuntimeSnapshot["documentStorage"];
  persist: () => Promise<void>;
}

export interface WorkerDependencies {
  dequeueJob: () => Promise<DocumentIndexJob | null>;
  getRuntime: () => Promise<WorkerRuntimeSnapshot>;
  executeJob: typeof executeDocumentJob;
  requeueJob: typeof requeueDocumentJob;
  moveToDeadLetter: typeof moveDocumentJobToDeadLetter;
  getMaxAttempts: typeof getDocumentQueueMaxAttempts;
  writeStdout: (message: string) => void;
  writeStderr: (message: string) => void;
}

export interface WorkerLifecycleController {
  isStopping: () => boolean;
  requestStop: (reason?: string) => void;
}

export function shouldExitWhenIdle(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return String(env.WORKER_EXIT_WHEN_IDLE ?? "").trim().toLowerCase() === "true";
}

export function createWorkerLifecycleController(
  onStop?: (reason: string) => void,
): WorkerLifecycleController {
  let stopping = false;
  return {
    isStopping: () => stopping,
    requestStop: (reason = "stop requested") => {
      if (stopping) return;
      stopping = true;
      onStop?.(reason);
    },
  };
}

export function bootstrapWorker(): string {
  return `${workerName} runtime is ready`;
}

export function createWorkerDependencies(): WorkerDependencies {
  return {
    dequeueJob: dequeueDocumentJobBlocking,
    getRuntime: async () => {
      const runtime = await getRuntime();
      return {
        documentService: runtime.documentService,
        ragService: runtime.ragService,
        documentStorage: runtime.documentStorage,
        persist: async () => {
          await runtime.persist();
        },
      };
    },
    executeJob: executeDocumentJob,
    requeueJob: requeueDocumentJob,
    moveToDeadLetter: moveDocumentJobToDeadLetter,
    getMaxAttempts: getDocumentQueueMaxAttempts,
    writeStdout: (message) => {
      process.stdout.write(message);
    },
    writeStderr: (message) => {
      process.stderr.write(message);
    },
  };
}

export async function processDocumentJobOnce(
  workerIndex: number,
  dependencies: WorkerDependencies = createWorkerDependencies(),
): Promise<"processed" | "retried" | "dead-lettered" | "idle"> {
  const maxAttempts = dependencies.getMaxAttempts();
  const job = await dependencies.dequeueJob();
  if (!job) {
    return "idle";
  }
  const runtime = await dependencies.getRuntime();

  try {
    await dependencies.executeJob({
      job,
      documentService: runtime.documentService,
      ragService: runtime.ragService,
      storage: runtime.documentStorage,
      persist: runtime.persist,
    });
    dependencies.writeStdout(
      `[${workerName}#${workerIndex}] Processed ${job.documentId} on attempt ${job.attempts + 1}\n`,
    );
    return "processed";
  } catch (error) {
    const attemptNumber = job.attempts + 1;
    if (attemptNumber < maxAttempts) {
      const retried = await dependencies.requeueJob(job);
      dependencies.writeStderr(
        `[${workerName}#${workerIndex}] Retry ${retried.attempts + 1}/${maxAttempts} queued for ${job.documentId}: ${String(error)}\n`,
      );
      return "retried";
    }

    const deadLetter = await dependencies.moveToDeadLetter(job, error);
    dependencies.writeStderr(
      `[${workerName}#${workerIndex}] Moved ${deadLetter.documentId} to dead-letter after ${attemptNumber}/${maxAttempts} attempts: ${deadLetter.errorMessage}\n`,
    );
    return "dead-lettered";
  }
}

async function runWorkerLoop(
  workerIndex: number,
  controller: WorkerLifecycleController,
  dependencies: WorkerDependencies,
): Promise<void> {
  while (!controller.isStopping()) {
    const result = await processDocumentJobOnce(workerIndex, dependencies);
    if (result === "idle" && shouldExitWhenIdle()) {
      controller.requestStop(`worker ${workerIndex} drained queue`);
      return;
    }
  }
}

async function main(): Promise<void> {
  loadApiEnv();
  const concurrency = Math.max(
    1,
    Number.parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10) || 1,
  );
  process.stdout.write(
    `${workerName} waiting for document jobs with concurrency ${concurrency} and queue timeout ${getDocumentQueueBlockTimeoutSeconds()}s...\n`,
  );
  const dependencies = createWorkerDependencies();
  const controller = createWorkerLifecycleController((reason) => {
    process.stdout.write(`${workerName} stopping: ${reason}\n`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      controller.requestStop(signal);
    });
  }

  await Promise.all(
    Array.from({ length: concurrency }, (_, index) =>
      runWorkerLoop(index + 1, controller, dependencies),
    ),
  );
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}
