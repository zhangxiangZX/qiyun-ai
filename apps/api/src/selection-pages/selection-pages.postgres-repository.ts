import { query } from "../db/pg";
import type { SelectionPageRecord, SelectionSubmissionRecord, SelectionPageConfig } from "./selection-pages.types";
import type { SelectionPagesRepository } from "./selection-pages.repository";

function asString(v: unknown): string { return String(v ?? ""); }
function asNullableString(v: unknown): string | null {
  const s = asString(v).trim();
  return s.length ? s : null;
}

function asIsoTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function mapRow(row: Record<string, unknown>): SelectionPageRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    name: asString(row.name),
    slug: asString(row.slug),
    description: asNullableString(row.description),
    config: (row.config ?? {}) as SelectionPageConfig,
    status: asString(row.status) as SelectionPageRecord["status"],
    createdAt: asIsoTimestamp(row.created_at),
    updatedAt: asIsoTimestamp(row.updated_at),
    deletedAt: row.deleted_at ? asIsoTimestamp(row.deleted_at) : null,
  };
}

function mapSubmissionRow(row: Record<string, unknown>): SelectionSubmissionRecord {
  return {
    id: asString(row.id),
    selectionPageId: asString(row.selection_page_id),
    answers: (row.answers ?? {}) as Record<string, string>,
    contactName: asNullableString(row.contact_name),
    contactPhone: asNullableString(row.contact_phone),
    contactEmail: asNullableString(row.contact_email),
    attachmentIds: Array.isArray(row.attachment_ids) ? row.attachment_ids.map(asString) : [],
    status: (asString(row.status) || "submitted") as SelectionSubmissionRecord["status"],
    inquiryId: asNullableString(row.inquiry_id),
    followTaskId: asNullableString(row.follow_task_id),
    createdAt: asIsoTimestamp(row.created_at),
  };
}

export class PostgresSelectionPagesRepository implements SelectionPagesRepository {
  async list(workspaceId: string): Promise<SelectionPageRecord[]> {
    const rows = await query(
      `select * from selection_pages where workspace_id = $1 and deleted_at is null order by updated_at desc`,
      [workspaceId],
    );
    return rows.map(mapRow);
  }

  async findById(workspaceId: string, id: string): Promise<SelectionPageRecord | null> {
    const rows = await query(
      `select * from selection_pages where id = $1 and workspace_id = $2 and deleted_at is null`,
      [id, workspaceId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<SelectionPageRecord | null> {
    const rows = await query(
      `select * from selection_pages where slug = $1 and deleted_at is null`,
      [slug],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async upsert(record: SelectionPageRecord): Promise<SelectionPageRecord> {
    await query(
      `insert into selection_pages (id, workspace_id, name, slug, description, config, status, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
       on conflict (id) do update set
         name = excluded.name,
         slug = excluded.slug,
         description = excluded.description,
         config = excluded.config,
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [record.id, record.workspaceId, record.name, record.slug,
       record.description, JSON.stringify(record.config ?? {}), record.status,
       record.createdAt, record.updatedAt],
    );
    return record;
  }

  async delete(workspaceId: string, id: string): Promise<{ id: string }> {
    const now = new Date().toISOString();
    await query(
      `update selection_pages set deleted_at = $1, updated_at = $1 where id = $2 and workspace_id = $3`,
      [now, id, workspaceId],
    );
    return { id };
  }

  async createSubmission(record: SelectionSubmissionRecord): Promise<SelectionSubmissionRecord> {
    await query(
      `insert into selection_submissions (id, selection_page_id, answers, contact_name, contact_phone, contact_email, attachment_ids, status, inquiry_id, follow_task_id, created_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)`,
      [record.id, record.selectionPageId, JSON.stringify(record.answers),
       record.contactName, record.contactPhone, record.contactEmail, JSON.stringify(record.attachmentIds),
       record.status, record.inquiryId, record.followTaskId, record.createdAt],
    );
    for (const fileId of record.attachmentIds) {
      await query(
        `insert into selection_submission_attachments (submission_id, workspace_id, file_id)
         select $1, workspace_id, $2 from selection_pages where id = $3
         on conflict (submission_id, file_id) do nothing`,
        [record.id, fileId, record.selectionPageId],
      );
    }
    return record;
  }

  async findSubmissionById(pageId: string, id: string): Promise<SelectionSubmissionRecord | null> {
    const rows = await query(
      `select * from selection_submissions where selection_page_id = $1 and id = $2 and deleted_at is null`,
      [pageId, id],
    );
    return rows[0] ? mapSubmissionRow(rows[0]) : null;
  }

  async listSubmissions(pageId: string): Promise<SelectionSubmissionRecord[]> {
    const rows = await query(
      `select * from selection_submissions where selection_page_id = $1 order by created_at desc`,
      [pageId],
    );
    return rows.map(mapSubmissionRow);
  }
}
