import { processDocumentJob } from "./documents/document-processor";

export const workerName = "qiyun-worker";

export function bootstrapWorker(): string {
  return "qiyun-worker document pipeline is ready";
}

export { processDocumentJob };
