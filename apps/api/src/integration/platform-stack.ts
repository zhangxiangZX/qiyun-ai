import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { InMemoryDocumentRepository } from "../documents/document.repository";
import { DocumentService } from "../documents/document.service";
import { LocalDocumentStorage } from "../documents/document-storage";
import type { DocumentIndexJob, QueueLike } from "../documents/document.types";
import { closePool, query } from "../db/pg";
import { collectHealthSnapshot } from "../health/health.service";
import { closeRedisClient, getRedisClient } from "../queue/redis";
import {
  InMemoryQdrantStore,
  QdrantVectorStore,
  SimpleEmbeddingProvider,
} from "../rag/rag.providers";
import { InMemoryRagRepository } from "../rag/rag.repository";
import { RagService } from "../rag/rag.service";
import type { VectorSearchStore } from "../rag/rag.types";

export interface PlatformTestStack {
  documentRepository: InMemoryDocumentRepository;
  ragRepository: InMemoryRagRepository;
  documentService: DocumentService;
  ragService: RagService;
  vectorStore: VectorSearchStore;
  storage: LocalDocumentStorage;
  cleanup(): Promise<void>;
}

export async function createPlatformTestStack(input?: {
  vectorStore?: VectorSearchStore;
  ragRepository?: InMemoryRagRepository;
}): Promise<PlatformTestStack> {
  const storageRoot = await mkdtemp(path.join(tmpdir(), "qiyun-platform-"));
  const previousStorageDir = process.env.DOCUMENT_STORAGE_DIR;
  process.env.DOCUMENT_STORAGE_DIR = storageRoot;

  const documentRepository = new InMemoryDocumentRepository();
  const ragRepository = input?.ragRepository ?? new InMemoryRagRepository();
  const storage = new LocalDocumentStorage();
  const pendingJobs: DocumentIndexJob[] = [];
  const queue: QueueLike = {
    async enqueue(job) {
      pendingJobs.push(job);
    },
    async list() {
      return [...pendingJobs];
    },
    async clear() {
      pendingJobs.length = 0;
    },
  };

  const documentService = new DocumentService(documentRepository, queue, storage);
  const vectorStore =
    input?.vectorStore ?? new InMemoryQdrantStore(() => ragRepository.listAllChunks());
  const ragService = new RagService(
    ragRepository,
    vectorStore,
    documentService,
    new SimpleEmbeddingProvider(),
  );

  return {
    documentRepository,
    ragRepository,
    documentService,
    ragService,
    vectorStore,
    storage,
    async cleanup() {
      if (previousStorageDir === undefined) {
        delete process.env.DOCUMENT_STORAGE_DIR;
      } else {
        process.env.DOCUMENT_STORAGE_DIR = previousStorageDir;
      }
    },
  };
}

export async function seedWorkspaceBotWithChunk(input: {
  stack: PlatformTestStack;
  workspaceId: string;
  botId: string;
  knowledgeBaseId: string;
  chunkId: string;
  content: string;
  foreignChunk?: {
    workspaceId: string;
    chunkId: string;
    content: string;
  };
}): Promise<void> {
  const now = new Date().toISOString();
  await input.stack.documentRepository.createKnowledgeBase({
    id: input.knowledgeBaseId,
    workspaceId: input.workspaceId,
    name: `KB ${input.knowledgeBaseId}`,
    status: "active",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await input.stack.documentRepository.createDocument({
    id: "doc_seed",
    workspaceId: input.workspaceId,
    knowledgeBaseId: input.knowledgeBaseId,
    fileName: "seed.md",
    fileType: "text/markdown",
    storageKey: `${input.workspaceId}/seed.md`,
    sizeBytes: 128,
    status: "ready",
    chunkCount: 1,
    errorCode: null,
    errorMessage: null,
    contentHash: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  await input.stack.ragService.upsertBot({
    id: input.botId,
    workspaceId: input.workspaceId,
    name: "Test Bot",
    status: "active",
    knowledgeBaseIds: [input.knowledgeBaseId],
  });

  const embedding = await new SimpleEmbeddingProvider().embedQuery(input.content);
  await input.stack.ragRepository.createChunk({
    id: input.chunkId,
    workspaceId: input.workspaceId,
    knowledgeBaseId: input.knowledgeBaseId,
    documentId: "doc_seed",
    documentTitle: "seed.md",
    content: input.content,
    sectionTitle: null,
    chunkIndex: 0,
    embedding,
  });

  if (input.foreignChunk) {
    await input.stack.ragRepository.createChunk({
      id: input.foreignChunk.chunkId,
      workspaceId: input.foreignChunk.workspaceId,
      knowledgeBaseId: "kb_foreign",
      documentId: "doc_foreign",
      documentTitle: "foreign.md",
      content: input.foreignChunk.content,
      sectionTitle: null,
      chunkIndex: 0,
      embedding: await new SimpleEmbeddingProvider().embedQuery(input.foreignChunk.content),
    });
  }
}

export function createMockedQdrantVectorStore(): QdrantVectorStore {
  return new QdrantVectorStore({
    baseUrl: "http://qdrant.test:6333",
    collectionName: "qiyun_chunks",
    dimensions: 12,
  });
}

export async function probeLivePostgres(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  try {
    const rows = await query("select 1 as ok");
    return Number(rows[0]?.ok) === 1;
  } finally {
    await closePool();
  }
}

export async function probeLiveRedis(): Promise<boolean> {
  if (!process.env.REDIS_URL) {
    return false;
  }

  try {
    const client = await getRedisClient();
    return (await client.ping()) === "PONG";
  } finally {
    await closeRedisClient();
  }
}

export async function probeLiveQdrant(): Promise<boolean> {
  const qdrantUrl = process.env.QDRANT_URL?.trim();
  if (!qdrantUrl) {
    return false;
  }

  const store = new QdrantVectorStore({
    baseUrl: qdrantUrl,
    collectionName: process.env.QDRANT_COLLECTION_NAME?.trim() || "qiyun_chunks",
    dimensions: Number.parseInt(process.env.QDRANT_VECTOR_SIZE ?? "12", 10) || 12,
  });
  const health = await store.healthCheck();
  return health.status === "ok";
}

export async function buildHealthSnapshotForStack(stack: PlatformTestStack) {
  return collectHealthSnapshot({
    runtimeDriver: "memory",
    isRedisQueueEnabled: process.env.DOCUMENT_QUEUE_DRIVER === "redis",
    pingPostgres: async () => {
      await query("select 1 as ok");
    },
    pingRedis: async () => {
      const client = await getRedisClient();
      return client.ping();
    },
    getVectorStoreHealth: () => stack.ragService.getVectorStoreHealth(),
    getEmbeddingProviderHealth: () => stack.ragService.getEmbeddingProviderHealth(),
    getObjectStorageHealth: () => stack.storage.healthCheck(),
  });
}
