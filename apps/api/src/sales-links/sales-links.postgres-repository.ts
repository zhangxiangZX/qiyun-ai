import { randomUUID } from "node:crypto";
import { query } from "../db/pg";
import type { SalesLinkRecord, ScanLogInput, ScanLogRecord } from "./sales-links.types";
import type { SalesLinksRepository } from "./sales-links.repository";

function asString(v: unknown): string { return String(v ?? ""); }
function asNumber(v: unknown): number { return Number(v ?? 0); }
function asNullableString(v: unknown): string | null {
  const s = asString(v).trim();
  return s.length ? s : null;
}

function mapRow(row: Record<string, unknown>): SalesLinkRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    name: asString(row.name),
    slug: asString(row.slug),
    channel: asString(row.channel) as SalesLinkRecord["channel"],
    targetUrl: asNullableString(row.target_url),
    shortUrl: asNullableString(row.short_url),
    status: asString(row.status) as SalesLinkRecord["status"],
    visits: asNumber(row.visits),
    inquiries: asNumber(row.inquiries),
    conversions: asNumber(row.conversions),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: asNullableString(row.deleted_at),
  };
}

function mapScanRow(row: Record<string, unknown>): ScanLogRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    salesLinkId: asString(row.sales_link_id),
    source: asString(row.source) as ScanLogRecord["source"],
    visitor: asNullableString(row.visitor),
    referer: asNullableString(row.referer),
    userAgent: asNullableString(row.user_agent),
    scannedAt: String(row.scanned_at),
  };
}

export class PostgresSalesLinksRepository implements SalesLinksRepository {
  async list(workspaceId: string): Promise<SalesLinkRecord[]> {
    const rows = await query(
      `select * from sales_links where workspace_id = $1 and deleted_at is null order by updated_at desc`,
      [workspaceId],
    );
    return rows.map(mapRow);
  }

  async findById(workspaceId: string, id: string): Promise<SalesLinkRecord | null> {
    const rows = await query(
      `select * from sales_links where id = $1 and workspace_id = $2 and deleted_at is null`,
      [id, workspaceId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<SalesLinkRecord | null> {
    const rows = await query(
      `select * from sales_links where slug = $1 and deleted_at is null`,
      [slug],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async create(record: SalesLinkRecord): Promise<SalesLinkRecord> {
    await query(
      `insert into sales_links (id, workspace_id, name, slug, channel, target_url, short_url, status, visits, inquiries, conversions, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [record.id, record.workspaceId, record.name, record.slug, record.channel,
       record.targetUrl, record.shortUrl, record.status, record.visits, record.inquiries,
       record.conversions, record.createdAt, record.updatedAt],
    );
    return record;
  }

  async update(workspaceId: string, id: string, patch: Partial<SalesLinkRecord>): Promise<SalesLinkRecord | null> {
    const existing = await this.findById(workspaceId, id);
    if (!existing) return null;
    const updates = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await query(
      `update sales_links set name=$1, slug=$2, channel=$3, target_url=$4, short_url=$5, status=$6, visits=$7, inquiries=$8, conversions=$9, updated_at=$10
       where id=$11 and workspace_id=$12`,
      [updates.name, updates.slug, updates.channel, updates.targetUrl, updates.shortUrl,
       updates.status, updates.visits, updates.inquiries, updates.conversions,
       updates.updatedAt, id, workspaceId],
    );
    return updates;
  }

  async delete(workspaceId: string, id: string): Promise<{ id: string }> {
    const now = new Date().toISOString();
    await query(
      `update sales_links set deleted_at=$1, updated_at=$1 where id=$2 and workspace_id=$3`,
      [now, id, workspaceId],
    );
    return { id };
  }

  async incrementVisits(workspaceId: string, id: string): Promise<void> {
    await query(
      `update sales_links set visits = visits + 1, updated_at = now() where id = $1 and workspace_id = $2`,
      [id, workspaceId],
    );
  }

  async incrementInquiries(workspaceId: string, id: string): Promise<void> {
    await query(
      `update sales_links set inquiries = inquiries + 1, conversions = conversions + 1, updated_at = now() where id = $1 and workspace_id = $2`,
      [id, workspaceId],
    );
  }

  async recordScanLog(input: ScanLogInput): Promise<void> {
    await query(
      `insert into scan_logs (id, workspace_id, sales_link_id, source, visitor, referer, user_agent, scanned_at)
       values ($1,$2,$3,$4,$5,$6,$7,now())`,
      [
        `scan_${randomUUID()}`,
        input.workspaceId,
        input.salesLinkId,
        input.source,
        input.visitor ?? null,
        input.referer ?? null,
        input.userAgent ?? null,
      ],
    );
  }

  async listScanLogs(workspaceId: string, salesLinkId: string, limit: number): Promise<ScanLogRecord[]> {
    const rows = await query(
      `select * from scan_logs where workspace_id = $1 and sales_link_id = $2 order by scanned_at desc limit $3`,
      [workspaceId, salesLinkId, limit],
    );
    return rows.map(mapScanRow);
  }
}
