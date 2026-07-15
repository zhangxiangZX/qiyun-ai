import { query } from "../db/pg";
import type {
  ChannelAccessRequest,
  ChannelId,
} from "./channels.types";
import type { ChannelsRepository } from "./channels.repository";

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asStringOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : asString(value);
}

export class PostgresChannelsRepository implements ChannelsRepository {
  async listChannelAccessRequests(workspaceId: string): Promise<ChannelAccessRequest[]> {
    const rows = await query(
      `select id, workspace_id, channel_id, status, requested_by, requested_at, reviewed_at, review_note
       from channel_access
       where workspace_id = $1
       order by requested_at desc`,
      [workspaceId],
    );
    return rows.map(mapRow);
  }

  async findChannelAccessRequest(
    workspaceId: string,
    channelId: ChannelId,
  ): Promise<ChannelAccessRequest | null> {
    const rows = await query(
      `select id, workspace_id, channel_id, status, requested_by, requested_at, reviewed_at, review_note
       from channel_access
       where workspace_id = $1 and channel_id = $2
       limit 1`,
      [workspaceId, channelId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async upsertChannelAccessRequest(record: ChannelAccessRequest): Promise<ChannelAccessRequest> {
    await query(
      `insert into channel_access
       (id, workspace_id, channel_id, status, requested_by, requested_at, reviewed_at, review_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (workspace_id, channel_id) do update set
         status = excluded.status,
         requested_by = excluded.requested_by,
         requested_at = excluded.requested_at,
         reviewed_at = excluded.reviewed_at,
         review_note = excluded.review_note`,
      [
        record.id,
        record.workspaceId,
        record.channelId,
        record.status,
        record.requestedBy,
        record.requestedAt,
        record.reviewedAt,
        record.reviewNote,
      ],
    );
    return record;
  }
}

function mapRow(row: Record<string, unknown>): ChannelAccessRequest {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    channelId: asString(row.channel_id) as ChannelId,
    status: asString(row.status) as ChannelAccessRequest["status"],
    requestedBy: asStringOrNull(row.requested_by),
    requestedAt: asString(row.requested_at),
    reviewedAt: asStringOrNull(row.reviewed_at),
    reviewNote: asStringOrNull(row.review_note),
  };
}
