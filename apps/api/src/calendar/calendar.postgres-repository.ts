import { randomUUID } from "node:crypto";

import { query } from "../db/pg";
import type { CalendarRepository } from "./calendar.repository";
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventKind,
  CalendarEventStatus,
} from "./calendar.types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = asString(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(asString(value)).toISOString();
}

function mapEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: asString(row.id),
    title: asString(row.title),
    start: normalizeDate(row.start),
    end: normalizeDate(row.end),
    kind: asString(row.kind) as CalendarEventKind,
    status: asString(row.status) as CalendarEventStatus,
    leadId: asNullableString(row.lead_id) ?? undefined,
    leadName: asNullableString(row.lead_name) ?? undefined,
    ownerName: asNullableString(row.owner_name) ?? undefined,
    note: asNullableString(row.note) ?? undefined,
  };
}

export class PostgresCalendarRepository implements CalendarRepository {
  async list(
    workspaceId: string,
    from?: string,
    to?: string,
  ): Promise<CalendarEvent[]> {
    if (from && to) {
      const rows = await query(
        `select * from calendar_events
         where workspace_id = $1
           and start < $3 and "end" > $2
         order by start asc`,
        [workspaceId, from, to],
      );
      return rows.map(mapEvent);
    }
    const rows = await query(
      `select * from calendar_events where workspace_id = $1 order by start asc`,
      [workspaceId],
    );
    return rows.map(mapEvent);
  }

  async get(workspaceId: string, id: string): Promise<CalendarEvent | null> {
    const rows = await query(
      `select * from calendar_events where workspace_id = $1 and id = $2`,
      [workspaceId, id],
    );
    return rows[0] ? mapEvent(rows[0]) : null;
  }

  async create(workspaceId: string, input: CalendarEventInput): Promise<CalendarEvent> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await query(
      `insert into calendar_events (
         id, workspace_id, title, start, "end", kind, status,
         lead_id, lead_name, owner_name, note, created_at, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id, workspaceId, input.title, input.start, input.end,
        input.kind, input.status ?? "pending",
        input.leadId ?? null, input.leadName ?? null,
        input.ownerName ?? null, input.note ?? null,
        now, now,
      ],
    );
    return {
      id, title: input.title, start: input.start, end: input.end,
      kind: input.kind, status: input.status ?? "pending",
      leadId: input.leadId, leadName: input.leadName,
      ownerName: input.ownerName, note: input.note,
    };
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Partial<CalendarEventInput>,
  ): Promise<CalendarEvent | null> {
    const current = await this.get(workspaceId, id);
    if (!current) return null;

    const now = new Date().toISOString();
    await query(
      `update calendar_events set
         title = $3, start = $4, "end" = $5, kind = $6, status = $7,
         lead_id = $8, lead_name = $9, owner_name = $10, note = $11,
         updated_at = $12
       where id = $1 and workspace_id = $2`,
      [
        id, workspaceId,
        patch.title ?? current.title,
        patch.start ?? current.start,
        patch.end ?? current.end,
        patch.kind ?? current.kind,
        patch.status ?? current.status,
        patch.leadId !== undefined ? patch.leadId : current.leadId,
        patch.leadName !== undefined ? patch.leadName : current.leadName,
        patch.ownerName !== undefined ? patch.ownerName : current.ownerName,
        patch.note !== undefined ? patch.note : current.note,
        now,
      ],
    );
    return { ...current, ...patch, id: current.id };
  }

  async remove(workspaceId: string, id: string): Promise<boolean> {
    await query(
      `delete from calendar_events where workspace_id = $1 and id = $2`,
      [workspaceId, id],
    );
    return true;
  }

  async count(workspaceId: string): Promise<number> {
    const rows = await query(
      `select count(*) as total from calendar_events where workspace_id = $1`,
      [workspaceId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async seedIfEmpty(workspaceId: string, events: CalendarEvent[]): Promise<void> {
    if ((await this.count(workspaceId)) > 0) return;
    for (const event of events) {
      await this.create(workspaceId, {
        title: event.title,
        start: event.start,
        end: event.end,
        kind: event.kind,
        status: event.status,
        leadId: event.leadId,
        leadName: event.leadName,
        ownerName: event.ownerName,
        note: event.note,
      });
    }
  }
}
