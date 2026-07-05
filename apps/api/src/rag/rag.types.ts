export type BotStatus = "draft" | "active" | "disabled";

export interface BotRecord {
  id: string;
  workspaceId: string;
  name: string;
  status: BotStatus;
  knowledgeBaseIds: string[];
  description: string;
  welcomeMessage: string;
  recommendedQuestions: string[];
  systemPrompt: string;
  collectLeadsOnFailure: boolean;
  rateLimitPerMinute: number;
  allowedDomains: string[];
  leadFields: string[];
  llmTemperature: number;
  maxOutputTokens: number;
  updatedAt: string;
}

export interface ChunkRecord {
  id: string;
  workspaceId: string;
  knowledgeBaseId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  embedding: number[];
}

export interface RetrievedChunk {
  chunkId: string;
  workspaceId: string;
  knowledgeBaseId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}

export interface RagCitation {
  chunkId: string;
  knowledgeBaseId: string;
  documentId: string;
  title: string;
  score: number;
  snippet: string;
}

export interface RagSearchResult {
  botId: string;
  workspaceId: string;
  query: string;
  citations: RagCitation[];
  contextBlocks: string[];
  needsLeadCapture: boolean;
  retrievalScore: number | null;
}

export interface EmbeddingProviderHealth {
  driver: "simple" | "openai-compatible";
  status: "ok" | "error";
  detail: string;
}

export interface QueryEmbeddingProvider {
  embedQuery(text: string): Promise<number[]>;
  healthCheck(): Promise<EmbeddingProviderHealth>;
}

export interface ReconcileChunksResult {
  upserted: number;
  deleted: number;
  total: number;
  status: "synced" | "degraded";
  attempts: number;
  error?: string;
}

export interface VectorSearchStore {
  ensureReady(): Promise<void>;
  upsertChunk(chunk: ChunkRecord): Promise<void>;
  deleteChunksByDocument(documentId: string): Promise<void>;
  reconcileChunks(chunks: ChunkRecord[]): Promise<ReconcileChunksResult>;
  healthCheck(): Promise<{
    driver: "memory" | "qdrant";
    status: "ok" | "error";
    detail?: string;
  }>;
  search(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    queryVector: number[];
    topK: number;
  }): Promise<RetrievedChunk[]>;
}
