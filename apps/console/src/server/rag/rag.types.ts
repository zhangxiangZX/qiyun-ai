export type BotStatus = "draft" | "active" | "disabled";

export interface BotRecord {
  id: string;
  workspaceId: string;
  name: string;
  status: BotStatus;
  knowledgeBaseIds: string[];
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

export interface QueryEmbeddingProvider {
  embedQuery(text: string): number[];
}

export interface VectorSearchStore {
  search(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    queryVector: number[];
    topK: number;
  }): RetrievedChunk[];
}
