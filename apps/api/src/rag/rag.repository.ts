import type { BotRecord, ChunkRecord } from "./rag.types";
import { normalizeBotRecord } from "./bot-defaults";

export interface RagRepository {
  upsertBot(record: BotRecord): Promise<BotRecord>;
  findBotById(id: string): Promise<BotRecord | null>;
  listBotsByWorkspace(workspaceId: string): Promise<BotRecord[]>;
  createChunk(record: ChunkRecord): Promise<ChunkRecord>;
  deleteChunksByDocument(documentId: string): Promise<number>;
  listChunks(): Promise<ChunkRecord[]>;
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

  async findBotById(id: string): Promise<BotRecord | null> {
    return this.bots.get(id) ?? null;
  }

  async listBotsByWorkspace(workspaceId: string): Promise<BotRecord[]> {
    return [...this.bots.values()].filter((bot) => bot.workspaceId === workspaceId);
  }

  async createChunk(record: ChunkRecord): Promise<ChunkRecord> {
    this.chunks.set(record.id, record);
    return record;
  }

  async deleteChunksByDocument(documentId: string): Promise<number> {
    let removed = 0;

    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.documentId !== documentId) {
        continue;
      }

      this.chunks.delete(chunkId);
      removed += 1;
    }

    return removed;
  }

  async listChunks(): Promise<ChunkRecord[]> {
    return [...this.chunks.values()];
  }
}
