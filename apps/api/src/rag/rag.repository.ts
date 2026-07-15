import type { BotRecord, ChunkRecord, RetrievedChunk } from "./rag.types";
import { normalizeBotRecord } from "./bot-defaults";
import { keywordOverlapScore } from "./rag.providers";

export interface RagRepository {
  upsertBot(record: BotRecord): Promise<BotRecord>;
  findBotById(workspaceId: string, id: string): Promise<BotRecord | null>;
  listBotsByWorkspace(workspaceId: string): Promise<BotRecord[]>;
  deleteBot(workspaceId: string, id: string): Promise<{ id: string }>;
  createChunk(record: ChunkRecord): Promise<ChunkRecord>;
  deleteChunksByDocument(workspaceId: string, documentId: string): Promise<number>;
  listChunks(workspaceId: string): Promise<ChunkRecord[]>;
  listAllChunks(): Promise<ChunkRecord[]>;
  listChunksByDocument(documentId: string): Promise<ChunkRecord[]>;
  searchChunksByKeyword(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    query: string;
    topK: number;
  }): Promise<RetrievedChunk[]>;
}

export class InMemoryRagRepository implements RagRepository {
  private readonly bots = new Map<string, BotRecord>();
  private readonly chunks = new Map<string, ChunkRecord>();

  loadSnapshot(input: { bots: BotRecord[]; chunks: ChunkRecord[] }): void {
    this.bots.clear();
    this.chunks.clear();

    for (const bot of input.bots) {
      this.bots.set(bot.id, normalizeBotRecord(bot));
    }

    for (const chunk of input.chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  dumpSnapshot(): { bots: BotRecord[]; chunks: ChunkRecord[] } {
    return {
      bots: [...this.bots.values()],
      chunks: [...this.chunks.values()],
    };
  }

  async upsertBot(record: BotRecord): Promise<BotRecord> {
    const normalized = normalizeBotRecord(record);
    this.bots.set(normalized.id, normalized);
    return normalized;
  }

  async findBotById(workspaceId: string, id: string): Promise<BotRecord | null> {
    const bot = this.bots.get(id);
    if (!bot || bot.workspaceId !== workspaceId) {
      return null;
    }
    return bot;
  }

  async listBotsByWorkspace(workspaceId: string): Promise<BotRecord[]> {
    return [...this.bots.values()].filter((bot) => bot.workspaceId === workspaceId);
  }

  async deleteBot(workspaceId: string, id: string): Promise<{ id: string }> {
    const bot = this.bots.get(id);
    if (!bot || bot.workspaceId !== workspaceId) {
      throw new Error("Bot not found in workspace.");
    }
    this.bots.delete(id);
    return { id };
  }

  async createChunk(record: ChunkRecord): Promise<ChunkRecord> {
    this.chunks.set(record.id, record);
    return record;
  }

  async deleteChunksByDocument(
    workspaceId: string,
    documentId: string,
  ): Promise<number> {
    let removed = 0;

    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.documentId !== documentId || chunk.workspaceId !== workspaceId) {
        continue;
      }

      this.chunks.delete(chunkId);
      removed += 1;
    }

    return removed;
  }

  async listChunks(workspaceId: string): Promise<ChunkRecord[]> {
    return [...this.chunks.values()].filter((chunk) => chunk.workspaceId === workspaceId);
  }

  async listAllChunks(): Promise<ChunkRecord[]> {
    return [...this.chunks.values()];
  }

  async listChunksByDocument(documentId: string): Promise<ChunkRecord[]> {
    return [...this.chunks.values()]
      .filter((chunk) => chunk.documentId === documentId)
      .sort((left, right) => (left.chunkIndex ?? 0) - (right.chunkIndex ?? 0));
  }

  async searchChunksByKeyword(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    query: string;
    topK: number;
  }): Promise<RetrievedChunk[]> {
    const allowed = new Set(input.knowledgeBaseIds);

    return [...this.chunks.values()]
      .filter(
        (chunk) =>
          chunk.workspaceId === input.workspaceId && allowed.has(chunk.knowledgeBaseId),
      )
      .map((chunk) => ({
        chunkId: chunk.id,
        workspaceId: chunk.workspaceId,
        knowledgeBaseId: chunk.knowledgeBaseId,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        sectionTitle: chunk.sectionTitle,
        content: chunk.content,
        score: keywordOverlapScore(input.query, `${chunk.sectionTitle ?? ""} ${chunk.content}`),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);
  }
}
