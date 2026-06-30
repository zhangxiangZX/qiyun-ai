import type { BotRecord, ChunkRecord } from "./rag.types";

export interface RagRepository {
  createBot(record: BotRecord): BotRecord;
  findBotById(id: string): BotRecord | null;
  createChunk(record: ChunkRecord): ChunkRecord;
  listChunks(): ChunkRecord[];
}

export class InMemoryRagRepository implements RagRepository {
  private readonly bots = new Map<string, BotRecord>();
  private readonly chunks = new Map<string, ChunkRecord>();

  createBot(record: BotRecord): BotRecord {
    this.bots.set(record.id, record);
    return record;
  }

  findBotById(id: string): BotRecord | null {
    return this.bots.get(id) ?? null;
  }

  createChunk(record: ChunkRecord): ChunkRecord {
    this.chunks.set(record.id, record);
    return record;
  }

  listChunks(): ChunkRecord[] {
    return [...this.chunks.values()];
  }
}
