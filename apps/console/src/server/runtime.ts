import { DocumentApi } from "@/server/documents/document.api";
import { InMemoryDocumentRepository } from "@/server/documents/document.repository";
import { DocumentService } from "@/server/documents/document.service";
import { createProcessingQueue } from "@/server/documents/document-queue";
import { PublicChatApi } from "@/server/chat/chat.api";
import { InMemoryChatRepository } from "@/server/chat/chat.repository";
import { ChatService } from "@/server/chat/chat.service";
import { InMemoryRagRepository } from "@/server/rag/rag.repository";
import { InMemoryQdrantStore, SimpleEmbeddingProvider } from "@/server/rag/rag.providers";
import { RagService } from "@/server/rag/rag.service";
import { DEFAULT_WORKSPACE_ID } from "@/server/workspace";

export interface ConsoleRuntime {
  documentApi: DocumentApi;
  documentService: DocumentService;
  ragService: RagService;
  ragRepository: InMemoryRagRepository;
  chatRepository: InMemoryChatRepository;
  chatService: ChatService;
  publicChatApi: PublicChatApi;
}

function buildChunkContent(fileName: string): string {
  const topic = fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  return [
    `Content from ${fileName}.`,
    `Topics include ${topic}.`,
    "Enterprise edition supports private deployment, flexible pricing, and widget embedding before </body>.",
    "Standard and professional plans differ in multi-bot management, lead export, and advanced reporting.",
  ].join(" ");
}

async function seedPreviewBots(runtime: ConsoleRuntime, workspaceId: string): Promise<void> {
  const previewBots = [
    {
      id: "bot-support",
      name: "\u5b98\u7f51\u5ba2\u670d",
      status: "active" as const,
      knowledgeBaseIds: [] as string[],
    },
    {
      id: "bot-sales",
      name: "\u9500\u552e\u987e\u95ee",
      status: "active" as const,
      knowledgeBaseIds: [] as string[],
    },
    {
      id: "bot-internal",
      name: "\u5185\u90e8\u77e5\u8bc6\u52a9\u624b",
      status: "active" as const,
      knowledgeBaseIds: [] as string[],
    },
  ];

  for (const bot of previewBots) {
    runtime.ragService.upsertBot({
      id: bot.id,
      workspaceId,
      name: bot.name,
      status: bot.status,
      knowledgeBaseIds: bot.knowledgeBaseIds,
    });

    await runtime.chatService.createSite({
      workspaceId,
      botId: bot.id,
      name: `${bot.name} Preview`,
      siteKey: `pk_preview_${bot.id}`,
      allowedDomains: ["localhost", "127.0.0.1"],
    });
  }
}

function createConsoleRuntime(): ConsoleRuntime {
  const documentRepository = new InMemoryDocumentRepository();
  const ragRepository = new InMemoryRagRepository();
  const chatRepository = new InMemoryChatRepository();
  const holder = {
    documentService: null as DocumentService | null,
    ragService: null as RagService | null,
  };

  const documentService = new DocumentService(
    documentRepository,
    createProcessingQueue(() => holder.documentService!, (document) => {
      holder.ragService!.indexChunk({
        workspaceId: document.workspaceId,
        knowledgeBaseId: document.knowledgeBaseId,
        documentId: document.id,
        documentTitle: document.fileName,
        content: buildChunkContent(document.fileName),
      });
    }),
  );

  const ragService = new RagService(
    ragRepository,
    new InMemoryQdrantStore(() => ragRepository.listChunks()),
    documentService,
    new SimpleEmbeddingProvider(),
  );

  holder.documentService = documentService;
  holder.ragService = ragService;

  const chatService = new ChatService(chatRepository, ragRepository, ragService);

  return {
    documentApi: new DocumentApi(documentService),
    documentService,
    ragService,
    ragRepository,
    chatRepository,
    chatService,
    publicChatApi: new PublicChatApi(chatService),
  };
}

const globalStore = globalThis as typeof globalThis & {
  __qiyunConsoleRuntime?: ConsoleRuntime;
  __qiyunConsoleRuntimeSeeded?: boolean;
};

function getConsoleRuntime(): ConsoleRuntime {
  if (!globalStore.__qiyunConsoleRuntime) {
    globalStore.__qiyunConsoleRuntime = createConsoleRuntime();
  }

  if (!globalStore.__qiyunConsoleRuntimeSeeded) {
    globalStore.__qiyunConsoleRuntimeSeeded = true;
    void seedPreviewBots(globalStore.__qiyunConsoleRuntime, DEFAULT_WORKSPACE_ID);
  }

  return globalStore.__qiyunConsoleRuntime;
}

export const runtime = getConsoleRuntime();

export const documentApi = runtime.documentApi;
export const publicChatApi = runtime.publicChatApi;
export const ragService = runtime.ragService;
