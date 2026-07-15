import type { BotRecord, ChunkRecord } from "./rag.types";

export interface RagRepository {
  upsertBot(record: BotRecord): BotRecord;
  findBotById(id: string): BotRecord | null;
  listBotsByWorkspace(workspaceId: string): BotRecord[];
  createChunk(record: ChunkRecord): ChunkRecord;
  listChunks(): ChunkRecord[];
}

export class InMemoryRagRepository implements RagRepository {
  private readonly bots = new Map<string, BotRecord>();
  private readonly chunks = new Map<string, ChunkRecord>();

  upsertBot(record: BotRecord): BotRecord {
    this.bots.set(record.id, record);
    return record;
  }

  findBotById(id: string): BotRecord | null {
    return this.bots.get(id) ?? null;
  }

  listBotsByWorkspace(workspaceId: string): BotRecord[] {
    return [...this.bots.values()].filter((bot) => bot.workspaceId === workspaceId);
  }

  createChunk(record: ChunkRecord): ChunkRecord {
    this.chunks.set(record.id, record);
    return record;
  }

  listChunks(): ChunkRecord[] {
    return [...this.chunks.values()];
  }
}
