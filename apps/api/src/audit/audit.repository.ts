import { query } from "../db/pg";

export interface AuditEntry {
  id: string;
  workspaceId: string;
  userId: string | null;
  module: string;
  action: string;
  targetId: string | null;
  ip: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface WriteAuditInput {
  workspaceId: string;
  userId: string | null;
  module: string;
  action: string;
  targetId?: string | null;
  ip?: string | null;
  detail?: Record<string, unknown> | null;
}

export interface ListAuditQuery {
  module?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditRepository {
  write(input: WriteAuditInput): Promise<AuditEntry>;
  list(workspaceId: string, query: ListAuditQuery): Promise<AuditEntry[]>;
}

function toJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = asString(value).trim();
  return text.length > 0 ? text : null;
}

function mapRow(row: Record<string, unknown>): AuditEntry {
  let detail: Record<string, unknown> | null = null;
  if (row.detail != null) {
    try {
      detail =
        typeof row.detail === "string" ? JSON.parse(row.detail) : (row.detail as Record<string, unknown>);
    } catch {
      detail = null;
    }
  }
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    userId: asNullableString(row.user_id),
    module: asString(row.module),
    action: asString(row.action),
    targetId: asNullableString(row.target_id),
    ip: asNullableString(row.ip),
    detail,
    createdAt: String(row.created_at),
  };
}

export class PostgresAuditRepository implements AuditRepository {
  async write(input: WriteAuditInput): Promise<AuditEntry> {
    const rows = await query(
      `insert into audit_logs (
         workspace_id, user_id, module, action, target_id, ip, detail, created_at
       ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
       returning *`,
      [
        input.workspaceId,
        input.userId ?? null,
        input.module,
        input.action,
        input.targetId ?? null,
        input.ip ?? null,
        toJson(input.detail ?? null),
      ],
    );
    return mapRow(rows[0]);
  }

  async list(workspaceId: string, listQuery: ListAuditQuery): Promise<AuditEntry[]> {
    const clauses = ["workspace_id = $1"];
    const params: unknown[] = [workspaceId];
    let idx = 2;
    if (listQuery.module) {
      clauses.push(`module = $${idx++}`);
      params.push(listQuery.module);
    }
    if (listQuery.targetId) {
      clauses.push(`target_id = $${idx}`);
      params.push(listQuery.targetId);
    }
    const limit = Math.min(Math.max(listQuery.limit ?? 50, 1), 200);
    const offset = Math.max(listQuery.offset ?? 0, 0);
    const where = clauses.join(" and ");
    const rows = await query(
      `select * from audit_logs where ${where} order by created_at desc limit ${limit} offset ${offset}`,
      params,
    );
    return rows.map(mapRow);
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly entries = new Map<string, AuditEntry>();
  private seq = 0;

  async write(input: WriteAuditInput): Promise<AuditEntry> {
    this.seq += 1;
    const entry: AuditEntry = {
      id: `audit_${this.seq}`,
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      module: input.module,
      action: input.action,
      targetId: input.targetId ?? null,
      ip: input.ip ?? null,
      detail: input.detail ?? null,
      createdAt: new Date().toISOString(),
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async list(workspaceId: string, listQuery: ListAuditQuery): Promise<AuditEntry[]> {
    let items = [...this.entries.values()].filter(
      (item) => item.workspaceId === workspaceId,
    );
    if (listQuery.module) {
      items = items.filter((item) => item.module === listQuery.module);
    }
    if (listQuery.targetId) {
      items = items.filter((item) => item.targetId === listQuery.targetId);
    }
    items.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    const limit = Math.min(Math.max(listQuery.limit ?? 50, 1), 200);
    const offset = Math.max(listQuery.offset ?? 0, 0);
    return items.slice(offset, offset + limit);
  }
}
