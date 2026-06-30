import { PublicChatApi } from "./chat/chat.api";
import { InMemoryChatRepository } from "./chat/chat.repository";
import { ChatService } from "./chat/chat.service";
import { getApiPort, loadApiEnv } from "./config/env";
import { DocumentApi } from "./documents/document.api";
import { InMemoryDocumentQueue } from "./documents/document.queue";
import { InMemoryDocumentRepository } from "./documents/document.repository";
import { DocumentService } from "./documents/document.service";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "./rag/rag.providers";
import { InMemoryRagRepository } from "./rag/rag.repository";
import { RagApi } from "./rag/rag.api";
import { RagService } from "./rag/rag.service";

export const appName = "qiyun-api";

export interface ApiRuntime {
  documentApi: DocumentApi;
  documentService: DocumentService;
  publicChatApi: PublicChatApi;
  chatService: ChatService;
  ragApi: RagApi;
  ragService: RagService;
}

export function createApiRuntime(): ApiRuntime {
  const documentRepository = new InMemoryDocumentRepository();
  const queue = new InMemoryDocumentQueue();
  const documentService = new DocumentService(documentRepository, queue);
  const ragRepository = new InMemoryRagRepository();
  const vectorStore = new InMemoryQdrantStore(() => ragRepository.listChunks());
  const ragService = new RagService(
    ragRepository,
    vectorStore,
    documentService,
    new SimpleEmbeddingProvider(),
  );
  const chatRepository = new InMemoryChatRepository();
  const chatService = new ChatService(chatRepository, ragRepository, ragService);

  return {
    documentApi: new DocumentApi(documentService),
    documentService,
    publicChatApi: new PublicChatApi(chatService),
    chatService,
    ragApi: new RagApi(ragService),
    ragService,
  };
}

export function createDocumentApi(): DocumentApi {
  return createApiRuntime().documentApi;
}

export function createRagApi(): RagApi {
  return createApiRuntime().ragApi;
}

export function createPublicChatApi(): PublicChatApi {
  return createApiRuntime().publicChatApi;
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
