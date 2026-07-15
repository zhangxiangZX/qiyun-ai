import { query } from "../db/pg";

export interface NotificationReadRepository {
  listReadIds(workspaceId: string, userId: string): Promise<Set<string>>;
  markRead(workspaceId: string, userId: string, notificationIds: string[]): Promise<void>;
}

export class InMemoryNotificationReadRepository implements NotificationReadRepository {
  private readonly reads = new Map<string, Set<string>>();

  private key(workspaceId: string, userId: string): string {
    return `${workspaceId}:${userId}`;
  }

  async listReadIds(workspaceId: string, userId: string): Promise<Set<string>> {
    return new Set(this.reads.get(this.key(workspaceId, userId)) ?? []);
  }

  async markRead(workspaceId: string, userId: string, notificationIds: string[]): Promise<void> {
    const scopeKey = this.key(workspaceId, userId);
    const current = this.reads.get(scopeKey) ?? new Set<string>();
    for (const id of notificationIds) {
      if (id.trim()) {
        current.add(id);
      }
    }
    this.reads.set(scopeKey, current);
  }

  clearForTests(): void {
    this.reads.clear();
  }
}

export class PostgresNotificationReadRepository implements NotificationReadRepository {
  async listReadIds(workspaceId: string, userId: string): Promise<Set<string>> {
    const rows = await query<{ notification_id: string }>(
      `select notification_id
         from notification_reads
        where workspace_id = $1 and user_id = $2`,
      [workspaceId, userId],
    );
    return new Set(rows.map((row) => row.notification_id));
  }

  async markRead(workspaceId: string, userId: string, notificationIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(notificationIds.filter((id) => id.trim()))];
    if (!uniqueIds.length) {
      return;
    }

    const values: unknown[] = [];
    const placeholders = uniqueIds.map((id, index) => {
      const base = index * 3;
      values.push(workspaceId, userId, id);
      return `($${base + 1}, $${base + 2}, $${base + 3}, NOW())`;
    });

    await query(
      `insert into notification_reads (workspace_id, user_id, notification_id, read_at)
       values ${placeholders.join(", ")}
       on conflict (workspace_id, user_id, notification_id) do update
         set read_at = excluded.read_at`,
      values,
    );
  }
}
