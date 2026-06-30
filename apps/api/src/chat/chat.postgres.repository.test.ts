import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  PostgresChatRepository,
  type SqlClient,
  type SqlQueryResult,
} from "./chat.postgres.repository";

class FakeSqlClient implements SqlClient {
  readonly calls: Array<{ sql: string; params: readonly unknown[] }> = [];
  private readonly queue: unknown[][] = [];

  pushRows<T>(rows: T[]): void {
    this.queue.push(rows);
  }

  async query<T>(sql: string, params: readonly unknown[]): Promise<SqlQueryResult<T>> {
    this.calls.push({ sql, params });
    const rows = (this.queue.shift() ?? []) as T[];
    return { rows };
  }
}

test("postgres repository inserts lead and field rows", async () => {
  const client = new FakeSqlClient();
  const repository = new PostgresChatRepository(client);

  client.pushRows([
    {
      id: "lead_1",
      workspace_id: "ws_alpha",
      bot_id: "bot_1",
      conversation_id: "conv_1",
      site_key: "pk_1",
      created_at: "2026-06-30T10:00:00.000Z",
    },
  ]);
  client.pushRows([{ lead_id: "lead_1", field_key: "name", field_value: "Zhang" }]);
  client.pushRows([{ lead_id: "lead_1", field_key: "phone", field_value: "13800000000" }]);

  const lead = await repository.createLead({
    id: "lead_1",
    workspaceId: "ws_alpha",
    botId: "bot_1",
    conversationId: "conv_1",
    siteKey: "pk_1",
    fields: {
      name: "Zhang",
      phone: "13800000000",
    },
    createdAt: "2026-06-30T10:00:00.000Z",
  });

  assert.equal(client.calls.length, 3);
  assert.match(client.calls[0]?.sql ?? "", /INSERT INTO leads/);
  assert.match(client.calls[1]?.sql ?? "", /INSERT INTO lead_fields/);
  assert.equal(lead.fields.name, "Zhang");
  assert.equal(lead.fields.phone, "13800000000");
});

test("postgres repository lists conversations by workspace", async () => {
  const client = new FakeSqlClient();
  const repository = new PostgresChatRepository(client);

  client.pushRows([
    {
      id: "conv_1",
      workspace_id: "ws_alpha",
      bot_id: "bot_1",
      visitor_id: "visitor_1",
      origin: "http://localhost:3000",
      created_at: "2026-06-30T10:00:00.000Z",
    },
  ]);

  const conversations = await repository.listConversationsByWorkspace("ws_alpha");

  assert.equal(conversations.length, 1);
  assert.equal(conversations[0]?.workspaceId, "ws_alpha");
  assert.match(client.calls[0]?.sql ?? "", /FROM conversations/);
  assert.deepEqual(client.calls[0]?.params, ["ws_alpha"]);
});
