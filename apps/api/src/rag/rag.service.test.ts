import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryDocumentRepository } from "../documents/document.repository";
import { DocumentService } from "../documents/document.service";
import type { DocumentStorage } from "../documents/document-storage";
import type { QueueLike } from "../documents/document.types";
import type {
  BotRecord,
  ChunkRecord,
  QueryEmbeddingProvider,
  RetrievedChunk,
  VectorSearchStore,
} from "./rag.types";
import { InMemoryRagRepository } from "./rag.repository";
import { RagService } from "./rag.service";

function createStorageStub(): DocumentStorage {
  return {
    async save() {
      return { storageKey: "memory", sizeBytes: 0 };
    },
    async read() {
      return new Uint8Array();
    },
    async remove() {
      return { action: "deleted", archivedStorageKey: null };
    },
    async healthCheck() {
      return { status: "ok", driver: "local", detail: "ok" };
    },
  };
}

function createBot(overrides: Partial<BotRecord> = {}): BotRecord {
  return {
    id: "bot_1",
    workspaceId: "ws_1",
    name: "Bot",
    status: "active",
    knowledgeBaseIds: ["kb_1"],
    description: "",
    welcomeMessage: "",
    recommendedQuestions: [],
    systemPrompt: "",
    collectLeadsOnFailure: true,
    rateLimitPerMinute: 30,
    allowedDomains: [],
    leadFields: ["name", "phone"],
    llmTemperature: 0.3,
    maxOutputTokens: 1024,
    updatedAt: "2026-07-04T00:00:00.000Z",
    ...overrides,
  };
}

test("search boosts title matches and widens candidate retrieval for Chinese product queries", async () => {
  const ragRepository = new InMemoryRagRepository();
  const documentRepository = new InMemoryDocumentRepository();
  const queue: QueueLike = {
    async enqueue() {},
    async list() {
      return [];
    },
    async clear() {},
  };
  const documentService = new DocumentService(
    documentRepository,
    queue,
    createStorageStub(),
  );

  await documentRepository.createKnowledgeBase({
    id: "kb_1",
    workspaceId: "ws_1",
    name: "知识库",
    status: "active",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
    deletedAt: null,
  });

  await ragRepository.upsertBot(createBot());

  const candidates: RetrievedChunk[] = [
    {
      chunkId: "chunk_wrong",
      workspaceId: "ws_1",
      knowledgeBaseId: "kb_1",
      documentId: "doc_wrong",
      documentTitle: "库滋玛-机柜系列选型手册.pdf.txt",
      sectionTitle: null,
      content: "该系列轻型悬臂组件用于悬挂或支撑小型控制箱体。",
      score: 0.09,
    },
    {
      chunkId: "chunk_right",
      workspaceId: "ws_1",
      knowledgeBaseId: "kb_1",
      documentId: "doc_right",
      documentTitle: "库滋玛-温控系列选型手册.pdf.txt",
      sectionTitle: null,
      content: "温控系列可根据散热需求、安装空间与防护要求进行选型。",
      score: 0.05,
    },
  ];

  let observedTopK = 0;
  const vectorStore: VectorSearchStore = {
    async ensureReady() {},
    async upsertChunk(_chunk: ChunkRecord) {},
    async deleteChunksByDocument(_documentId: string) {},
    async reconcileChunks(_chunks: ChunkRecord[]) {
      return { upserted: 0, deleted: 0, total: 0, status: "synced", attempts: 1 } as const;
    },
    async healthCheck() {
      return { driver: "memory", status: "ok", detail: "ok" } as const;
    },
    async search(input) {
      observedTopK = input.topK;
      return candidates;
    },
  };

  const embeddingProvider: QueryEmbeddingProvider = {
    async embedQuery() {
      return [0.1, 0.2, 0.3];
    },
    async healthCheck() {
      return { driver: "simple", status: "ok", detail: "ok" };
    },
  };

  const service = new RagService(
    ragRepository,
    vectorStore,
    documentService,
    embeddingProvider,
  );

  const result = await service.search({
    workspaceId: "ws_1",
    botId: "bot_1",
    query: "温控系列怎么选型？",
  });

  assert.equal(observedTopK, 24);
  assert.equal(result.needsLeadCapture, false);
  assert.equal(result.citations[0]?.title, "库滋玛-温控系列选型手册.pdf.txt");
  assert.ok((result.retrievalScore ?? 0) >= 0.35);
});
