import { query } from "../db/pg";
import { normalizeBotRecord } from "./bot-defaults";
import type { RagRepository } from "./rag.repository";
import type { BotRecord, ChunkRecord, RetrievedChunk } from "./rag.types";
import { keywordOverlapScore } from "./rag.providers";

type QueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values?: unknown[],
) => Promise<T[]>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = asString(value).trim();
  return text.length > 0 ? text : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)) : [];
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : [];
}

function normalizeDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(asString(value)).toISOString();
}

function toJson<T>(value: T): string {
  return JSON.stringify(value);
}

function mapBot(row: Record<string, unknown>): BotRecord {
  return normalizeBotRecord({
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    name: asString(row.name),
    status: asString(row.status) as BotRecord["status"],
    knowledgeBaseIds: asStringArray(row.knowledge_base_ids),
    description: row.description === undefined ? undefined : asString(row.description),
    welcomeMessage:
      row.welcome_message === undefined ? undefined : asString(row.welcome_message),
    recommendedQuestions:
      row.recommended_questions === undefined
        ? undefined
        : asStringArray(row.recommended_questions),
    systemPrompt:
      row.system_prompt === undefined ? undefined : asString(row.system_prompt),
    collectLeadsOnFailure:
      row.collect_leads_on_failure === undefined
        ? undefined
        : Boolean(row.collect_leads_on_failure),
    rateLimitPerMinute:
      row.rate_limit_per_minute === undefined
        ? undefined
        : Number(row.rate_limit_per_minute),
    allowedDomains:
      row.allowed_domains === undefined ? undefined : asStringArray(row.allowed_domains),
    leadFields:
      row.lead_fields === undefined ? undefined : asStringArray(row.lead_fields),
    llmTemperature:
      row.llm_temperature === undefined ? undefined : Number(row.llm_temperature),
    maxOutputTokens:
      row.max_output_tokens === undefined ? undefined : Number(row.max_output_tokens),
    updatedAt:
      row.updated_at === undefined ? undefined : normalizeDate(row.updated_at),
  });
}

function mapChunk(row: Record<string, unknown>): ChunkRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    knowledgeBaseId: asString(row.knowledge_base_id),
    documentId: asString(row.document_id),
    documentTitle: asString(row.document_title),
    sectionTitle: asNullableString(row.section_title),
    chunkIndex:
      row.chunk_index === null || row.chunk_index === undefined
        ? null
        : Number(row.chunk_index),
    content: asString(row.content),
    embedding: asNumberArray(row.embedding),
  };
}

export class PostgresRagRepository implements RagRepository {
  constructor(private readonly runQuery: QueryFn = query) {}

  async upsertBot(record: BotRecord): Promise<BotRecord> {
    const normalized = normalizeBotRecord(record);
    const rows = await this.runQuery(
      `insert into bots (
         id, workspace_id, name, status, knowledge_base_ids,
         description, welcome_message, system_prompt,
         recommended_questions,
         collect_leads_on_failure, rate_limit_per_minute,
         allowed_domains, lead_fields, llm_temperature, max_output_tokens, updated_at
       )
       values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
       on conflict (id) do update set
         workspace_id = excluded.workspace_id,
         name = excluded.name,
         status = excluded.status,
         knowledge_base_ids = excluded.knowledge_base_ids,
         description = excluded.description,
         welcome_message = excluded.welcome_message,
         system_prompt = excluded.system_prompt,
         recommended_questions = excluded.recommended_questions,
         collect_leads_on_failure = excluded.collect_leads_on_failure,
         rate_limit_per_minute = excluded.rate_limit_per_minute,
         allowed_domains = excluded.allowed_domains,
         lead_fields = excluded.lead_fields,
         llm_temperature = excluded.llm_temperature,
         max_output_tokens = excluded.max_output_tokens,
         updated_at = excluded.updated_at
       returning *`,
      [
        normalized.id,
        normalized.workspaceId,
        normalized.name,
        normalized.status,
        toJson(normalized.knowledgeBaseIds),
        normalized.description,
        normalized.welcomeMessage,
        normalized.systemPrompt,
        toJson(normalized.recommendedQuestions),
        normalized.collectLeadsOnFailure,
        normalized.rateLimitPerMinute,
        toJson(normalized.allowedDomains),
        toJson(normalized.leadFields),
        normalized.llmTemperature,
        normalized.maxOutputTokens,
        normalized.updatedAt,
      ],
    );
    return mapBot(rows[0]!);
  }

  async findBotById(
    workspaceId: string,
    id: string,
  ): Promise<BotRecord | null> {
    const rows = await this.runQuery(
      `select * from bots where workspace_id = $1 and id = $2 limit 1`,
      [workspaceId, id],
    );
    return rows[0] ? mapBot(rows[0]) : null;
  }

  async listBotsByWorkspace(workspaceId: string): Promise<BotRecord[]> {
    const rows = await this.runQuery(
      `select * from bots where workspace_id = $1 order by updated_at desc, name asc`,
      [workspaceId],
    );
    return rows.map(mapBot);
  }

  async deleteBot(workspaceId: string, id: string): Promise<{ id: string }> {
    await this.runQuery(
      `delete from bots where id = $1 and workspace_id = $2`,
      [id, workspaceId],
    );
    return { id };
  }

  async createChunk(record: ChunkRecord): Promise<ChunkRecord> {
    await this.runQuery(
      `insert into document_chunks
       (id, workspace_id, knowledge_base_id, document_id, document_title, section_title, chunk_index, content, embedding)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        record.id,
        record.workspaceId,
        record.knowledgeBaseId,
        record.documentId,
        record.documentTitle,
        record.sectionTitle,
        record.chunkIndex,
        record.content,
        toJson(record.embedding),
      ],
    );
    return record;
  }

  async deleteChunksByDocument(
    workspaceId: string,
    documentId: string,
  ): Promise<number> {
    const rows = await this.runQuery(
      `delete from document_chunks where workspace_id = $1 and document_id = $2 returning id`,
      [workspaceId, documentId],
    );
    return rows.length;
  }

  async listChunks(workspaceId: string): Promise<ChunkRecord[]> {
    const rows = await this.runQuery(
      `select * from document_chunks
       where workspace_id = $1
       order by document_id asc, chunk_index asc nulls last, id asc`,
      [workspaceId],
    );
    return rows.map(mapChunk);
  }

  async listAllChunks(): Promise<ChunkRecord[]> {
    const rows = await this.runQuery(
      `select * from document_chunks
       order by document_id asc, chunk_index asc nulls last, id asc`,
      [],
    );
    return rows.map(mapChunk);
  }

  async listChunksByDocument(documentId: string): Promise<ChunkRecord[]> {
    const rows = await this.runQuery(
      `select * from document_chunks
       where document_id = $1
       order by chunk_index asc nulls last, id asc`,
      [documentId],
    );
    return rows.map(mapChunk);
  }

  async searchChunksByKeyword(input: {
    workspaceId: string;
    knowledgeBaseIds: string[];
    query: string;
    topK: number;
  }): Promise<RetrievedChunk[]> {
    const rows = await this.runQuery(
      `select * from document_chunks
       where workspace_id = $1
         and knowledge_base_id = any($2::text[])`,
      [input.workspaceId, input.knowledgeBaseIds],
    );

    return rows
      .map(mapChunk)
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
