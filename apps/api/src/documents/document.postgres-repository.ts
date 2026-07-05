import { query } from "../db/pg";
import type { DocumentRepository } from "./document.repository";
import type {
  DocumentErrorCode,
  DocumentRecord,
  KnowledgeBaseRecord,
  KnowledgeBaseSummary,
} from "./document.types";

type QueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values?: unknown[],
) => Promise<T[]>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : asString(value);
}

function normalizeDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(asString(value)).toISOString();
}

function mapKnowledgeBase(row: Record<string, unknown>): KnowledgeBaseRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    name: asString(row.name),
    status: asString(row.status) as KnowledgeBaseRecord["status"],
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
    deletedAt: row.deleted_at ? normalizeDate(row.deleted_at) : null,
  };
}

function mapDocument(row: Record<string, unknown>): DocumentRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    knowledgeBaseId: asString(row.knowledge_base_id),
    fileName: asString(row.file_name),
    fileType: asString(row.file_type),
    storageKey: asString(row.storage_key),
    sizeBytes: Number(row.size_bytes),
    status: asString(row.status) as DocumentRecord["status"],
    chunkCount:
      row.chunk_count === null || row.chunk_count === undefined
        ? null
        : Number(row.chunk_count),
    errorCode:
      row.error_code === null || row.error_code === undefined
        ? null
        : (asString(row.error_code) as DocumentErrorCode),
    errorMessage: asNullableString(row.error_message),
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
    deletedAt: row.deleted_at ? normalizeDate(row.deleted_at) : null,
  };
}

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly runQuery: QueryFn = query) {}

  async createKnowledgeBase(record: KnowledgeBaseRecord): Promise<KnowledgeBaseRecord> {
    await this.runQuery(
      `insert into knowledge_bases
       (id, workspace_id, name, status, created_at, updated_at, deleted_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        record.id,
        record.workspaceId,
        record.name,
        record.status,
        record.createdAt,
        record.updatedAt,
        record.deletedAt,
      ],
    );
    return record;
  }

  async findKnowledgeBaseById(id: string): Promise<KnowledgeBaseRecord | null> {
    const rows = await this.runQuery(
      `select * from knowledge_bases where id = $1 limit 1`,
      [id],
    );
    return rows[0] ? mapKnowledgeBase(rows[0]) : null;
  }

  async findKnowledgeBaseByName(
    workspaceId: string,
    name: string,
  ): Promise<KnowledgeBaseRecord | null> {
    const rows = await this.runQuery(
      `select * from knowledge_bases
       where workspace_id = $1
         and deleted_at is null
         and lower(name) = lower($2)
       order by created_at asc
       limit 1`,
      [workspaceId, name],
    );
    return rows[0] ? mapKnowledgeBase(rows[0]) : null;
  }

  async listKnowledgeBases(workspaceId: string): Promise<KnowledgeBaseRecord[]> {
    const rows = await this.runQuery(
      `select * from knowledge_bases
       where workspace_id = $1 and deleted_at is null
       order by updated_at desc`,
      [workspaceId],
    );
    return rows.map(mapKnowledgeBase);
  }

  async updateKnowledgeBase(
    id: string,
    patch: Partial<KnowledgeBaseRecord>,
  ): Promise<KnowledgeBaseRecord | null> {
    const current = await this.findKnowledgeBaseById(id);
    if (!current) return null;

    const next = { ...current, ...patch };
    const rows = await this.runQuery(
      `update knowledge_bases
       set workspace_id = $2,
           name = $3,
           status = $4,
           created_at = $5,
           updated_at = $6,
           deleted_at = $7
       where id = $1
       returning *`,
      [
        id,
        next.workspaceId,
        next.name,
        next.status,
        next.createdAt,
        next.updatedAt,
        next.deletedAt,
      ],
    );
    return rows[0] ? mapKnowledgeBase(rows[0]) : null;
  }

  async createDocument(record: DocumentRecord): Promise<DocumentRecord> {
    await this.runQuery(
      `insert into documents
       (id, workspace_id, knowledge_base_id, file_name, file_type, storage_key, size_bytes, status, chunk_count, error_code, error_message, created_at, updated_at, deleted_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        record.id,
        record.workspaceId,
        record.knowledgeBaseId,
        record.fileName,
        record.fileType,
        record.storageKey,
        record.sizeBytes,
        record.status,
        record.chunkCount,
        record.errorCode,
        record.errorMessage,
        record.createdAt,
        record.updatedAt,
        record.deletedAt,
      ],
    );
    return record;
  }

  async updateDocument(
    id: string,
    patch: Partial<DocumentRecord>,
  ): Promise<DocumentRecord | null> {
    const current = await this.findDocumentById(id);
    if (!current) return null;

    const next = { ...current, ...patch };
    const rows = await this.runQuery(
      `update documents
       set workspace_id = $2,
           knowledge_base_id = $3,
           file_name = $4,
           file_type = $5,
           storage_key = $6,
           size_bytes = $7,
           status = $8,
           chunk_count = $9,
           error_code = $10,
           error_message = $11,
           created_at = $12,
           updated_at = $13,
           deleted_at = $14
       where id = $1
       returning *`,
      [
        id,
        next.workspaceId,
        next.knowledgeBaseId,
        next.fileName,
        next.fileType,
        next.storageKey,
        next.sizeBytes,
        next.status,
        next.chunkCount,
        next.errorCode,
        next.errorMessage,
        next.createdAt,
        next.updatedAt,
        next.deletedAt,
      ],
    );
    return rows[0] ? mapDocument(rows[0]) : null;
  }

  async findDocumentById(id: string): Promise<DocumentRecord | null> {
    const rows = await this.runQuery(
      `select * from documents where id = $1 limit 1`,
      [id],
    );
    return rows[0] ? mapDocument(rows[0]) : null;
  }

  async listDocumentsByKnowledgeBase(knowledgeBaseId: string): Promise<DocumentRecord[]> {
    const rows = await this.runQuery(
      `select * from documents
       where knowledge_base_id = $1 and deleted_at is null
       order by updated_at desc`,
      [knowledgeBaseId],
    );
    return rows.map(mapDocument);
  }

  async softDeleteDocumentsByKnowledgeBase(
    knowledgeBaseId: string,
    deletedAt: string,
  ): Promise<number> {
    const rows = await this.runQuery(
      `update documents
       set deleted_at = $2,
           updated_at = $2
       where knowledge_base_id = $1 and deleted_at is null
       returning id`,
      [knowledgeBaseId, deletedAt],
    );
    return rows.length;
  }

  async summarizeKnowledgeBase(
    knowledgeBaseId: string,
  ): Promise<
    Pick<KnowledgeBaseSummary, "documentCount" | "readyDocumentCount" | "failedDocumentCount">
  > {
    const rows = await this.runQuery<{
      document_count: unknown;
      ready_document_count: unknown;
      failed_document_count: unknown;
    }>(
      `select
         count(*)::int as document_count,
         count(*) filter (where status = 'ready')::int as ready_document_count,
         count(*) filter (where status = 'failed')::int as failed_document_count
       from documents
       where knowledge_base_id = $1 and deleted_at is null`,
      [knowledgeBaseId],
    );

    const row = rows[0];
    return {
      documentCount: Number(row?.document_count ?? 0),
      readyDocumentCount: Number(row?.ready_document_count ?? 0),
      failedDocumentCount: Number(row?.failed_document_count ?? 0),
    };
  }
}
