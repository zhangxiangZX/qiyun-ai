import { randomUUID } from "node:crypto";

import type { DocumentService } from "@/server/documents/document.service";
import {
  keywordOverlapScore,
  SimpleEmbeddingProvider,
} from "./rag.providers";
import type {
  BotRecord,
  QueryEmbeddingProvider,
  RagCitation,
  RagSearchResult,
  RetrievedChunk,
  VectorSearchStore,
} from "./rag.types";
import type { RagRepository } from "./rag.repository";

export class RagAccessError extends Error {}
export class RagValidationError extends Error {}

function toSnippet(content: string): string {
  return content.length <= 160 ? content : `${content.slice(0, 157)}...`;
}

export class RagService {
  constructor(
    private readonly repository: RagRepository,
    private readonly vectorStore: VectorSearchStore,
    private readonly documents: DocumentService,
    private readonly embeddingProvider: QueryEmbeddingProvider = new SimpleEmbeddingProvider(),
    private readonly retrievalThreshold = 0.55,
  ) {}

  upsertBot(input: {
    id: string;
    workspaceId: string;
    name: string;
    status?: BotRecord["status"];
    knowledgeBaseIds?: string[];
  }): BotRecord {
    const knowledgeBaseIds = input.knowledgeBaseIds ?? [];

    for (const knowledgeBaseId of knowledgeBaseIds) {
      this.documents.getKnowledgeBase(input.workspaceId, knowledgeBaseId);
    }

    return this.repository.upsertBot({
      id: input.id,
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      status: input.status ?? "active",
      knowledgeBaseIds,
    });
  }

  indexChunk(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    documentId: string;
    documentTitle: string;
    content: string;
  }) {
    const content = input.content.trim();
    if (!content) {
      throw new RagValidationError("Chunk content is required.");
    }

    this.documents.getKnowledgeBase(input.workspaceId, input.knowledgeBaseId);
    this.documents.getDocument(input.workspaceId, input.documentId);

    const embedding = this.embeddingProvider.embedQuery(content);

    return this.repository.createChunk({
      id: `chunk_${randomUUID()}`,
      workspaceId: input.workspaceId,
      knowledgeBaseId: input.knowledgeBaseId,
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      content,
      embedding,
    });
  }

  search(input: {
    workspaceId: string;
    botId: string;
    query: string;
    topK?: number;
    maxCitations?: number;
  }): RagSearchResult {
    const bot = this.requireBot(input.workspaceId, input.botId);
    const query = input.query.trim();

    if (!query) {
      throw new RagValidationError("Query is required.");
    }

    if (bot.status !== "active") {
      throw new RagAccessError("Bot is not active.");
    }

    if (bot.knowledgeBaseIds.length === 0) {
      return this.emptyResult(input.workspaceId, bot.id, query);
    }

    for (const knowledgeBaseId of bot.knowledgeBaseIds) {
      this.documents.getKnowledgeBase(input.workspaceId, knowledgeBaseId);
    }

    const queryVector = this.embeddingProvider.embedQuery(query);
    const retrieved = this.vectorStore.search({
      workspaceId: input.workspaceId,
      knowledgeBaseIds: bot.knowledgeBaseIds,
      queryVector,
      topK: input.topK ?? 6,
    });

    if (retrieved.length === 0) {
      return this.emptyResult(input.workspaceId, bot.id, query);
    }

    const reranked = this.rerank(query, retrieved).slice(0, input.maxCitations ?? 3);
    const bestScore = reranked[0]?.score ?? null;

    if (bestScore === null || bestScore < this.retrievalThreshold) {
      return {
        botId: bot.id,
        workspaceId: input.workspaceId,
        query,
        citations: [],
        contextBlocks: [],
        needsLeadCapture: true,
        retrievalScore: bestScore,
      };
    }

    const citations = reranked.map((chunk) => this.toCitation(chunk));

    return {
      botId: bot.id,
      workspaceId: input.workspaceId,
      query,
      citations,
      contextBlocks: reranked.map(
        (chunk) => `[${chunk.documentTitle}#${chunk.chunkId}] ${chunk.content}`,
      ),
      needsLeadCapture: false,
      retrievalScore: bestScore,
    };
  }

  listBots(workspaceId: string): BotRecord[] {
    return this.repository.listBotsByWorkspace(workspaceId);
  }

  private rerank(query: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
    return chunks
      .map((chunk) => {
        const keywordScore = keywordOverlapScore(query, chunk.content);
        const rerankedScore = Number((chunk.score * 0.7 + keywordScore * 0.3).toFixed(4));
        return { ...chunk, score: rerankedScore };
      })
      .sort((left, right) => right.score - left.score);
  }

  private toCitation(chunk: RetrievedChunk): RagCitation {
    return {
      chunkId: chunk.chunkId,
      knowledgeBaseId: chunk.knowledgeBaseId,
      documentId: chunk.documentId,
      title: chunk.documentTitle,
      score: chunk.score,
      snippet: toSnippet(chunk.content),
    };
  }

  private requireBot(workspaceId: string, botId: string): BotRecord {
    const bot = this.repository.findBotById(botId);

    if (!bot || bot.workspaceId !== workspaceId) {
      throw new RagAccessError("Bot not found in workspace.");
    }

    return bot;
  }

  private emptyResult(workspaceId: string, botId: string, query: string): RagSearchResult {
    return {
      botId,
      workspaceId,
      query,
      citations: [],
      contextBlocks: [],
      needsLeadCapture: true,
      retrievalScore: null,
    };
  }
}
