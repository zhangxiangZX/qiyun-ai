import { AuthApi } from "./auth/auth.api";
import {
  createEmailLoginCodeMailerBundle,
  createWorkspaceInvitationMailerBundle,
  InMemoryEmailLoginCodeMailer,
  InMemoryWorkspaceInvitationMailer,
  InMemoryWorkspaceInvitationDeliveryAuditStore,
  RetryingWorkspaceInvitationMailer,
  type EmailLoginCodeMailer,
  type WorkspaceInvitationDeliveryAuditStore,
  type WorkspaceInvitationMailer,
} from "./auth/auth.mailer";
import { PostgresAuthRepository } from "./auth/auth.postgres-repository";
import {
  InMemoryAuthRepository,
  type AuthRepository,
} from "./auth/auth.repository";
import { PublicChatApi } from "./chat/chat.api";
import { PostgresChatRepository } from "./chat/chat.postgres-repository";
import type { ChatRepository } from "./chat/chat.repository";
import { InMemoryChatRepository } from "./chat/chat.repository";
import { ChatService } from "./chat/chat.service";
import { getApiRuntimeDriver } from "./config/env";
import { ensureMigrationsApplied } from "./db/migrate";
import { query as pgQuery } from "./db/pg";
import { createLlmChatClient } from "./llm/llm-chat";
import { createProcessingQueue } from "./documents/document-queue";
import { DocumentApi } from "./documents/document.api";
import { PostgresDocumentRepository } from "./documents/document.postgres-repository";
import {
  InMemoryDocumentRepository,
  type DocumentRepository,
} from "./documents/document.repository";
import { DocumentService } from "./documents/document.service";
import { createDocumentStorage, type DocumentStorage } from "./documents/document-storage";
import { collectHealthSnapshot } from "./health/health.service";
import type { HealthSnapshot } from "./health/health.types";
import { getRedisClient } from "./queue/redis";
import {
  buildVectorIndexConsistencyLog,
  emitVectorIndexConsistencyLog,
} from "./rag/vector-index-log";
import {
  DegradingVectorStore,
} from "./rag/degrading-vector-store";
import {
  DegradingEmbeddingProvider,
  InMemoryQdrantStore,
  OpenAICompatibleEmbeddingProvider,
  QdrantVectorStore,
  SimpleEmbeddingProvider,
} from "./rag/rag.providers";
import { PostgresRagRepository } from "./rag/rag.postgres-repository";
import {
  InMemoryRagRepository,
  type RagRepository,
} from "./rag/rag.repository";
import { RagService } from "./rag/rag.service";
import type { QueryEmbeddingProvider, VectorSearchStore } from "./rag/rag.types";
import { DEFAULT_WORKSPACE_ID } from "./workspace";
import {
  InMemoryNotificationReadRepository,
  PostgresNotificationReadRepository,
  type NotificationReadRepository,
} from "./notifications/notification-read.repository";
import { NotificationService } from "./notifications/notification.service";

export interface ApiRuntime {
  driver: "memory" | "postgres";
  authRepository: AuthRepository;
  authApi: AuthApi;
  invitationMailer: WorkspaceInvitationMailer;
  invitationAuditStore: WorkspaceInvitationDeliveryAuditStore;
  invitationDebugMailer: InMemoryWorkspaceInvitationMailer | null;
  emailLoginCodeMailer: EmailLoginCodeMailer;
  emailLoginCodeDebugMailer: InMemoryEmailLoginCodeMailer | null;
  documentRepository: DocumentRepository;
  documentStorage: DocumentStorage;
  documentApi: DocumentApi;
  documentService: DocumentService;
  ragService: RagService;
  ragRepository: RagRepository;
  chatRepository: ChatRepository;
  chatService: ChatService;
  publicChatApi: PublicChatApi;
  notificationReadRepository: NotificationReadRepository;
  notificationService: NotificationService;
  healthCheck(): Promise<HealthSnapshot>;
  persist(): Promise<void>;
}

function isPreviewSeedEnabled(
  driver: "memory" | "postgres",
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.API_SEED_PREVIEW?.trim().toLowerCase();
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return driver === "memory";
}

function createEmbeddingProvider(): QueryEmbeddingProvider {
  const llmProvider = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const embeddingBaseUrl = (
    process.env.LLM_EMBEDDING_BASE_URL?.trim() || baseUrl
  )?.trim();
  const sameProviderBaseUrl =
    baseUrl &&
    embeddingBaseUrl &&
    baseUrl.replace(/\/+$/, "") === embeddingBaseUrl.replace(/\/+$/, "");
  const apiKey =
    process.env.LLM_EMBEDDING_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || (sameProviderBaseUrl ? process.env.LLM_API_KEY?.trim() : undefined);
  const model = process.env.LLM_EMBEDDING_MODEL?.trim();
  const expectedDimensions =
    Number.parseInt(process.env.QDRANT_VECTOR_SIZE ?? "", 10) || undefined;
  const timeoutMs =
    Number.parseInt(process.env.LLM_EMBEDDING_TIMEOUT_MS ?? "", 10) || 10000;

  const embeddingEnabled = process.env.LLM_EMBEDDING_ENABLED !== "false";
  const supportsRemoteEmbedding =
    embeddingEnabled &&
    embeddingBaseUrl !== undefined &&
    !embeddingBaseUrl.toLowerCase().includes("deepseek.com");

  const fallback = (detail: string, status: "ok" | "error" = "error") =>
    new SimpleEmbeddingProvider(expectedDimensions ?? 12, detail, status);

  if (process.env.NODE_ENV === "test") {
    return fallback(
      `Test runtime uses local embeddings with ${expectedDimensions ?? 12} dimensions.`,
      "ok",
    );
  }

  if (!embeddingEnabled) {
    return fallback(
      `Remote embeddings are disabled by configuration. Serving local embeddings with ${expectedDimensions ?? 12} dimensions.`,
      "ok",
    );
  }

  if (!embeddingBaseUrl) {
    return fallback("Embedding is enabled, but no embedding base URL is configured.");
  }

  if (embeddingBaseUrl.toLowerCase().includes("deepseek.com")) {
    return fallback(
      "Embedding base URL points to DeepSeek. Configure a dedicated OpenAI-compatible embedding provider instead.",
    );
  }

  if (!model) {
    return fallback("Embedding is enabled, but no embedding model is configured.");
  }

  if (!apiKey || apiKey === "replace-me") {
    return fallback(
      "Embedding is enabled, but no valid LLM_EMBEDDING_API_KEY or OPENAI_API_KEY is configured. Serving local embeddings instead.",
    );
  }

  if (
    process.env.NODE_ENV !== "test" &&
    llmProvider.includes("openai") &&
    embeddingBaseUrl &&
    supportsRemoteEmbedding
  ) {
    return new DegradingEmbeddingProvider(
      new OpenAICompatibleEmbeddingProvider({
        baseUrl: embeddingBaseUrl,
        apiKey,
        model,
        timeoutMs,
        expectedDimensions,
      }),
      new SimpleEmbeddingProvider(expectedDimensions ?? 12),
    );
  }

  return fallback(
    "Embedding provider configuration is incomplete for remote usage. Serving local embeddings instead.",
  );
}

function createVectorStore(ragRepository: RagRepository): VectorSearchStore {
  const driver = process.env.VECTOR_STORE_DRIVER?.trim().toLowerCase();
  const qdrantUrl = process.env.QDRANT_URL?.trim();
  const fallback = new InMemoryQdrantStore(() => ragRepository.listChunks());

  if (process.env.NODE_ENV !== "test" && driver === "qdrant" && qdrantUrl) {
    return new DegradingVectorStore(
      new QdrantVectorStore({
        baseUrl: qdrantUrl,
        collectionName: process.env.QDRANT_COLLECTION_NAME?.trim() || "qiyun_chunks",
        dimensions: Number.parseInt(process.env.QDRANT_VECTOR_SIZE ?? "12", 10) || 12,
      }),
      fallback,
    );
  }

  return fallback;
}

async function seedPreviewData(
  runtime: ApiRuntime,
  workspaceId: string,
): Promise<void> {
  const kbProduct = await runtime.documentService.createKnowledgeBase({
    workspaceId,
    name: "Product Handbook",
  });
  const kbPricing = await runtime.documentService.createKnowledgeBase({
    workspaceId,
    name: "Pricing Notes",
  });

  const readyDocA = (
    await runtime.documentService.uploadDocuments({
    workspaceId,
    knowledgeBaseId: kbProduct.id,
    files: [
      {
        fileName: "deployment-guide.pdf",
        fileType: "application/pdf",
        sizeBytes: 8192,
        contentBytes: new TextEncoder().encode(
          "Private deployment supports dedicated resources, custom domain binding, and secure widget embedding for enterprise websites.",
        ),
      },
    ],
  })
  )[0];
  const readyDocB = (
    await runtime.documentService.uploadDocuments({
    workspaceId,
    knowledgeBaseId: kbPricing.id,
    files: [
      {
        fileName: "pricing-faq.md",
        fileType: "text/markdown",
        sizeBytes: 4096,
        contentBytes: new TextEncoder().encode(
          "# Pricing FAQ\n\nStandard plan supports one bot and basic reporting.\n\nProfessional plan supports multi-bot management, lead export, and advanced reporting.",
        ),
      },
    ],
  })
  )[0];

  await runtime.documentService.applyWorkerStatus({
    workspaceId,
    documentId: readyDocA.id,
    status: "ready",
    chunkCount: 4,
  });
  await runtime.documentService.applyWorkerStatus({
    workspaceId,
    documentId: readyDocB.id,
    status: "ready",
    chunkCount: 2,
  });
  await runtime.ragService.replaceDocumentChunks({
    workspaceId: readyDocA.workspaceId,
    knowledgeBaseId: readyDocA.knowledgeBaseId,
    documentId: readyDocA.id,
    documentTitle: readyDocA.fileName,
    chunks: [
      {
        content:
          "Private deployment supports dedicated resources, domain binding, and secure widget embedding before body close.",
      },
    ],
  });
  await runtime.ragService.replaceDocumentChunks({
    workspaceId: readyDocB.workspaceId,
    knowledgeBaseId: readyDocB.knowledgeBaseId,
    documentId: readyDocB.id,
    documentTitle: readyDocB.fileName,
    chunks: [
      {
        content:
          "Standard plan supports one bot. Professional plan supports multi-bot management and advanced reporting.",
      },
    ],
  });

  const bots = [
    {
      id: "bot-support",
      name: "Website Support",
      status: "active" as const,
      knowledgeBaseIds: [kbProduct.id],
    },
    {
      id: "bot-sales",
      name: "Sales Advisor",
      status: "active" as const,
      knowledgeBaseIds: [kbPricing.id],
    },
    {
      id: "bot-internal",
      name: "Internal Copilot",
      status: "active" as const,
      knowledgeBaseIds: [kbProduct.id, kbPricing.id],
    },
  ];

  for (const bot of bots) {
    await runtime.ragService.upsertBot({
      id: bot.id,
      workspaceId,
      name: bot.name,
      status: bot.status,
      knowledgeBaseIds: bot.knowledgeBaseIds,
      ...(bot.id === "bot-support"
        ? {
            recommendedQuestions: [
              "这款产品的技术参数是什么？",
              "支持非标定制吗？",
              "交货周期大概多久？",
            ],
          }
        : {}),
    });

    await runtime.chatService.createSite({
      workspaceId,
      botId: bot.id,
      name: `${bot.name} Preview`,
      siteKey: `pk_preview_${bot.id}`,
      allowedDomains: ["localhost", "127.0.0.1"],
    });
  }

  const supportChat = await runtime.chatService.stream({
    botId: "bot-support",
    siteKey: "pk_preview_bot-support",
    visitorId: "visitor-1001",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "How long does private deployment usually take?",
  });

  await runtime.chatService.submitLead({
    botId: "bot-support",
    siteKey: "pk_preview_bot-support",
    conversationId: supportChat.conversation.id,
    fields: {
      name: "Alice Chen",
      phone: "13800001111",
      company: "Acme Manufacturing",
      requirement: "咨询私有化部署周期与报价",
    },
  });

  await runtime.chatService.stream({
    botId: "bot-sales",
    siteKey: "pk_preview_bot-sales",
    visitorId: "visitor-2002",
    sdkVersion: "1.0.0",
    origin: "http://localhost:3000",
    message: "Can you share the difference between standard and professional plans?",
  });
}

async function hasPreviewSeedData(
  runtime: ApiRuntime,
  workspaceId: string,
): Promise<boolean> {
  const [bots, knowledgeBases, sites] = await Promise.all([
    runtime.ragService.listBots(workspaceId),
    runtime.documentService.listKnowledgeBases(workspaceId),
    runtime.chatService.listSites(workspaceId),
  ]);

  return bots.length > 0 || knowledgeBases.length > 0 || sites.length > 0;
}

function createApiRuntime(): ApiRuntime {
  const driver = getApiRuntimeDriver();
  const authRepository: AuthRepository =
    driver === "postgres" ? new PostgresAuthRepository() : new InMemoryAuthRepository();
  let invitationMailer: WorkspaceInvitationMailer;
  let invitationAuditStore: WorkspaceInvitationDeliveryAuditStore;
  let invitationDebugMailer: InMemoryWorkspaceInvitationMailer | null = null;
  let emailLoginCodeMailer: EmailLoginCodeMailer;
  let emailLoginCodeDebugMailer: InMemoryEmailLoginCodeMailer | null = null;

  if (process.env.NODE_ENV === "test") {
    invitationDebugMailer = new InMemoryWorkspaceInvitationMailer();
    emailLoginCodeDebugMailer = new InMemoryEmailLoginCodeMailer();
    invitationAuditStore = new InMemoryWorkspaceInvitationDeliveryAuditStore();
    invitationMailer = new RetryingWorkspaceInvitationMailer(
      "memory",
      invitationDebugMailer,
      invitationAuditStore,
      {
        maxAttempts: 3,
        retryDelayMs: 0,
      },
    );
    emailLoginCodeMailer = emailLoginCodeDebugMailer;
  } else {
    const invitationBundle = createWorkspaceInvitationMailerBundle({
      APP_NAME: process.env.APP_NAME,
      APP_URL: process.env.APP_URL ?? "http://localhost:3000",
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_MAX_ATTEMPTS: process.env.EMAIL_MAX_ATTEMPTS,
      EMAIL_RETRY_DELAY_MS: process.env.EMAIL_RETRY_DELAY_MS,
    });
    const loginCodeBundle = createEmailLoginCodeMailerBundle({
      APP_NAME: process.env.APP_NAME,
      APP_URL: process.env.APP_URL ?? "http://localhost:3000",
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_MAX_ATTEMPTS: process.env.EMAIL_MAX_ATTEMPTS,
      EMAIL_RETRY_DELAY_MS: process.env.EMAIL_RETRY_DELAY_MS,
    });
    invitationMailer = invitationBundle.mailer;
    invitationAuditStore = invitationBundle.auditStore;
    emailLoginCodeMailer = loginCodeBundle.mailer;
  }
  const documentRepository: DocumentRepository =
    driver === "postgres" ? new PostgresDocumentRepository() : new InMemoryDocumentRepository();
  const documentStorage = createDocumentStorage();
  const ragRepository: RagRepository =
    driver === "postgres" ? new PostgresRagRepository() : new InMemoryRagRepository();
  const vectorStore = createVectorStore(ragRepository);
  const embeddingProvider = createEmbeddingProvider();
  const chatRepository: ChatRepository =
    driver === "postgres" ? new PostgresChatRepository() : new InMemoryChatRepository();
  const notificationReadRepository: NotificationReadRepository =
    driver === "postgres"
      ? new PostgresNotificationReadRepository()
      : new InMemoryNotificationReadRepository();
  const llmChat = createLlmChatClient();
  const holder = {
    documentService: null as DocumentService | null,
    ragService: null as RagService | null,
  };

  const documentService = new DocumentService(
    documentRepository,
    createProcessingQueue({
      getDocumentService: () => holder.documentService!,
      getRagService: () => holder.ragService!,
      storage: documentStorage,
      persist: async () => {
        await holderRuntime?.persist();
      },
    }),
    documentStorage,
  );

  const ragService = new RagService(
    ragRepository,
    vectorStore,
    documentService,
    embeddingProvider,
  );

  holder.documentService = documentService;
  holder.ragService = ragService;

  const chatService = new ChatService(
    chatRepository,
    ragRepository,
    ragService,
    documentStorage,
    llmChat,
  );
  const authEnv = {
    APP_NAME: process.env.APP_NAME ?? "qiyun-ai",
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    JWT_SECRET: process.env.JWT_SECRET ?? "change-me",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "change-me-too",
  } as Record<string, string>;

  const runtime: ApiRuntime = {
    driver,
    authRepository,
    authApi: new AuthApi(
      authRepository,
      authEnv,
      invitationMailer,
      invitationAuditStore,
      emailLoginCodeMailer,
    ),
    invitationMailer,
    invitationAuditStore,
    invitationDebugMailer,
    emailLoginCodeMailer,
    emailLoginCodeDebugMailer,
    documentRepository,
    documentStorage,
    documentApi: new DocumentApi(documentService, ragService),
    documentService,
    ragService,
    ragRepository,
    chatRepository,
    chatService,
    publicChatApi: new PublicChatApi(chatService, chatRepository, ragRepository),
    notificationReadRepository,
    notificationService: null as unknown as NotificationService,
    async healthCheck() {
      return collectHealthSnapshot({
        runtimeDriver: driver,
        isRedisQueueEnabled: process.env.DOCUMENT_QUEUE_DRIVER === "redis",
        pingPostgres: async () => {
          await pgQuery("select 1 as ok");
        },
        pingRedis: async () => {
          const client = await getRedisClient();
          return client.ping();
        },
        getVectorStoreHealth: () => ragService.getVectorStoreHealth(),
        getEmbeddingProviderHealth: () => ragService.getEmbeddingProviderHealth(),
        getObjectStorageHealth: () => documentStorage.healthCheck(),
      });
    },
    async persist() {},
  };

  runtime.notificationService = new NotificationService(runtime, notificationReadRepository);

  holderRuntime = runtime;
  return runtime;
}

let holderRuntime: ApiRuntime | null = null;

const globalStore = globalThis as typeof globalThis & {
  __qiyunApiRuntime?: ApiRuntime;
  __qiyunApiRuntimeSeeded?: boolean;
  __qiyunApiRuntimePromise?: Promise<ApiRuntime>;
  __qiyunApiRuntimeSeedPromise?: Promise<void>;
};

export async function getRuntime(): Promise<ApiRuntime> {
  if (!globalStore.__qiyunApiRuntimePromise) {
    globalStore.__qiyunApiRuntimePromise = (async () => {
      if (getApiRuntimeDriver() === "postgres") {
        await ensureMigrationsApplied();
      }

      if (!globalStore.__qiyunApiRuntime) {
        globalStore.__qiyunApiRuntime = createApiRuntime();
      }

      const runtime = globalStore.__qiyunApiRuntime;

      if (!globalStore.__qiyunApiRuntimeSeedPromise) {
        globalStore.__qiyunApiRuntimeSeedPromise = (async () => {
          if (globalStore.__qiyunApiRuntimeSeeded) {
            return;
          }

          const previewSeedEnabled = isPreviewSeedEnabled(runtime.driver);
          const hasSeedData = await hasPreviewSeedData(runtime, DEFAULT_WORKSPACE_ID);

          if (previewSeedEnabled && !hasSeedData) {
            await seedPreviewData(runtime, DEFAULT_WORKSPACE_ID);
          }

          await runtime.authApi.ensurePlatformAdmin();

          if (runtime.driver === "postgres") {
            const syncSnapshot = await runtime.ragService.syncStoredChunks();
            emitVectorIndexConsistencyLog(
              buildVectorIndexConsistencyLog({
                trigger: "startup",
                snapshot: syncSnapshot,
              }),
            );
          }

          globalStore.__qiyunApiRuntimeSeeded = true;
        })();
      }

      await globalStore.__qiyunApiRuntimeSeedPromise;
      return runtime;
    })();
  }

  return globalStore.__qiyunApiRuntimePromise;
}

export function resetRuntimeForTests(): void {
  delete globalStore.__qiyunApiRuntime;
  delete globalStore.__qiyunApiRuntimeSeeded;
  delete globalStore.__qiyunApiRuntimePromise;
  delete globalStore.__qiyunApiRuntimeSeedPromise;
  holderRuntime = null;
}

export const runtimeInternals = {
  createEmbeddingProvider,
  hasPreviewSeedData,
  isPreviewSeedEnabled,
};
