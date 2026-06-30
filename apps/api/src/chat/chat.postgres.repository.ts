import type {
  ConversationRecord,
  LeadRecord,
  MessageRecord,
} from "./chat.types";

export interface SqlQueryResult<T> {
  rows: T[];
}

export interface SqlClient {
  query<T>(sql: string, params: readonly unknown[]): Promise<SqlQueryResult<T>>;
}

type ConversationRow = {
  id: string;
  workspace_id: string;
  bot_id: string;
  visitor_id: string;
  origin: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  workspace_id: string;
  bot_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type LeadRow = {
  id: string;
  workspace_id: string;
  bot_id: string;
  conversation_id: string;
  site_key: string;
  created_at: string;
};

type LeadFieldRow = {
  lead_id: string;
  field_key: string;
  field_value: string;
};

function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    botId: row.bot_id,
    visitorId: row.visitor_id,
    origin: row.origin,
    createdAt: row.created_at,
  };
}

function mapMessageRow(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    botId: row.bot_id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapLead(row: LeadRow, fieldRows: LeadFieldRow[]): LeadRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    botId: row.bot_id,
    conversationId: row.conversation_id,
    siteKey: row.site_key,
    fields: Object.fromEntries(fieldRows.map((field) => [field.field_key, field.field_value])),
    createdAt: row.created_at,
  };
}

export class PostgresChatRepository {
  constructor(private readonly client: SqlClient) {}

  async createConversation(record: ConversationRecord): Promise<ConversationRecord> {
    const sql = `
      INSERT INTO conversations (id, workspace_id, bot_id, visitor_id, origin, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, workspace_id, bot_id, visitor_id, origin, created_at
    `;
    const result = await this.client.query<ConversationRow>(sql, [
      record.id,
      record.workspaceId,
      record.botId,
      record.visitorId,
      record.origin,
      record.createdAt,
    ]);

    return mapConversationRow(result.rows[0]!);
  }

  async findConversationById(id: string): Promise<ConversationRecord | null> {
    const sql = `
      SELECT id, workspace_id, bot_id, visitor_id, origin, created_at
      FROM conversations
      WHERE id = $1
      LIMIT 1
    `;
    const result = await this.client.query<ConversationRow>(sql, [id]);
    return result.rows[0] ? mapConversationRow(result.rows[0]) : null;
  }

  async listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]> {
    const sql = `
      SELECT id, workspace_id, bot_id, visitor_id, origin, created_at
      FROM conversations
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.client.query<ConversationRow>(sql, [workspaceId]);
    return result.rows.map(mapConversationRow);
  }

  async createMessage(record: MessageRecord): Promise<MessageRecord> {
    const sql = `
      INSERT INTO messages (id, workspace_id, bot_id, conversation_id, role, content, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, workspace_id, bot_id, conversation_id, role, content, created_at
    `;
    const result = await this.client.query<MessageRow>(sql, [
      record.id,
      record.workspaceId,
      record.botId,
      record.conversationId,
      record.role,
      record.content,
      record.createdAt,
    ]);

    return mapMessageRow(result.rows[0]!);
  }

  async listMessagesByConversation(conversationId: string): Promise<MessageRecord[]> {
    const sql = `
      SELECT id, workspace_id, bot_id, conversation_id, role, content, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;
    const result = await this.client.query<MessageRow>(sql, [conversationId]);
    return result.rows.map(mapMessageRow);
  }

  async createLead(record: LeadRecord): Promise<LeadRecord> {
    const leadSql = `
      INSERT INTO leads (id, workspace_id, bot_id, conversation_id, site_key, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, workspace_id, bot_id, conversation_id, site_key, created_at
    `;
    const leadResult = await this.client.query<LeadRow>(leadSql, [
      record.id,
      record.workspaceId,
      record.botId,
      record.conversationId,
      record.siteKey,
      record.createdAt,
    ]);

    const fieldEntries = Object.entries(record.fields);
    const insertedFields: LeadFieldRow[] = [];

    for (const [fieldKey, fieldValue] of fieldEntries) {
      const fieldSql = `
        INSERT INTO lead_fields (lead_id, field_key, field_value)
        VALUES ($1, $2, $3)
        RETURNING lead_id, field_key, field_value
      `;
      const fieldResult = await this.client.query<LeadFieldRow>(fieldSql, [
        record.id,
        fieldKey,
        fieldValue,
      ]);
      insertedFields.push(fieldResult.rows[0]!);
    }

    return mapLead(leadResult.rows[0]!, insertedFields);
  }

  async listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]> {
    const leadsSql = `
      SELECT id, workspace_id, bot_id, conversation_id, site_key, created_at
      FROM leads
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `;
    const leadsResult = await this.client.query<LeadRow>(leadsSql, [workspaceId]);

    const output: LeadRecord[] = [];

    for (const lead of leadsResult.rows) {
      const fieldSql = `
        SELECT lead_id, field_key, field_value
        FROM lead_fields
        WHERE lead_id = $1
        ORDER BY field_key ASC
      `;
      const fieldsResult = await this.client.query<LeadFieldRow>(fieldSql, [lead.id]);
      output.push(mapLead(lead, fieldsResult.rows));
    }

    return output;
  }
}
