import { getApiPort, loadApiEnv } from "./config/env";
import { DocumentApi } from "./documents/document.api";
import { InMemoryDocumentQueue } from "./documents/document.queue";
import { InMemoryDocumentRepository } from "./documents/document.repository";
import { DocumentService } from "./documents/document.service";

export const appName = "qiyun-api";

export function createDocumentApi(): DocumentApi {
  const repository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const service = new DocumentService(repository, queue);
  return new DocumentApi(service);
}

export function bootstrapApi(env: Record<string, string | undefined> = process.env): {
  appName: string;
  port: number;
} {
  const loadedEnv = loadApiEnv(env);

  return {
    appName,
    port: getApiPort(loadedEnv),
  };
}
