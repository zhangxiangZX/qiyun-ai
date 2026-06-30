import { PublicChatApi } from "./chat/chat.api";
import { InMemoryChatRepository } from "./chat/chat.repository";
import { ChatService } from "./chat/chat.service";
import { getApiPort, loadApiEnv } from "./config/env";
import { DocumentApi } from "./documents/document.api";
import { InMemoryDocumentQueue } from "./documents/document.queue";
import { InMemoryDocumentRepository } from "./documents/document.repository";
import { DocumentService } from "./documents/document.service";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "./rag/rag.providers";
import { RagRepository, InMemoryRagRepository } from "./rag/rag.repository";
import { RagApi } from "./rag/rag.api";
import { RagService } from "./rag/rag.service";

export const appName = "qiyun-api";

export function createDocumentApi(): DocumentApi {
  const repository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const service = new DocumentService(repository, queue);
  return new DocumentApi(service);
}

export function createRagApi(): RagApi {
  const documentRepository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const documentService = new DocumentService(documentRepository, queue);
  const ragRepository: RagRepository = new InMemoryRagRepository();
  const vectorStore = new InMemoryQdrantStore(() => ragRepository.listChunks());
  const embeddingProvider = new SimpleEmbeddingProvider();
  const service = new RagService(
    ragRepository,
    vectorStore,
    documentService,
    embeddingProvider,
  );

  return new RagApi(service);
}

export function createPublicChatApi(): PublicChatApi {
  const documentRepository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const documentService = new DocumentService(documentRepository, queue);
  const ragRepository: RagRepository = new InMemoryRagRepository();
  const vectorStore = new InMemoryQdrantStore(() => ragRepository.listChunks());
  const ragService = new RagService(
    ragRepository,
    vectorStore,
    documentService,
    new SimpleEmbeddingProvider(),
  );
  const chatRepository = new InMemoryChatRepository();
  const chatService = new ChatService(chatRepository, ragRepository, ragService);

  return new PublicChatApi(chatService);
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
