import { query, type PoolClient, withTransaction } from "../db/pg";
import { hashSiteKey } from "../security/site-key";
import type {
  ChatRepository,
  ConversationMetaRecord,
  TransactionalChatRepository,
} from "./chat.repository";
import type { ConversationListQuery } from "./conversation-list-query";
import {
  mapConversation,
  mapConversationMeta,
  mapLead,
  mapLeadMeta,
  mapMessage,
  mapSite,
  toJson,
} from "./db-mappers";
import type {
  ConversationRecord,
  LeadMetaRecord,
  LeadRecord,
  MessageRecord,
  SiteRecord,
  SiteKeyAuditRecord,
} from "./chat.types";

type QueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values?: unknown[],
) => Promise<T[]>;

function createClientQuery(client: PoolClient): QueryFn {
  return async <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> => {
    const result = await client.query<T>(text, values);
    return result.rows;
  };
}

export class PostgresChatRepository implements TransactionalChatRepository {
  constructor(private readonly runQuery: QueryFn = query) {}

  async createSite(
    record: SiteRecord,
    secret: { siteKey: string; siteKeyHash: string },
  ): Promise<SiteRecord> {
    await this.runQuery(
      `insert into sites
       (id, workspace_id, bot_id, name, site_key, site_key_hash, site_key_prefix, allowed_domains, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [
        record.id,
        record.workspaceId,
        record.botId,
        record.name,
        null,
        secret.siteKeyHash,
        record.siteKeyPrefix,
        toJson(record.allowedDomains),
        record.status,
      ],
    );
    return record;
  }

  async listSitesByWorkspace(workspaceId: string): Promise<SiteRecord[]> {
    const rows = await this.runQuery(
      `select * from sites where workspace_id = $1 order by name asc`,
      [workspaceId],
    );
    return rows.map(mapSite);
  }

  async findSiteByKey(siteKey: string): Promise<SiteRecord | null> {
    const keyHash = hashSiteKey(siteKey);
    const rows = await this.runQuery(
      `select * from sites
       where site_key_hash = $1
       limit 1`,
      [keyHash],
    );
    return rows[0] ? mapSite(rows[0]) : null;
  }

  async findSiteByBotId(
    workspaceId: string,
    botId: string,
  ): Promise<SiteRecord | null> {
    const rows = await this.runQuery(
      `select * from sites where workspace_id = $1 and bot_id = $2 limit 1`,
      [workspaceId, botId],
    );
    return rows[0] ? mapSite(rows[0]) : null;
  }

  async rotateSiteKey(
    siteId: string,
    secret: { siteKey: string; siteKeyHash: string; siteKeyPrefix: string },
  ): Promise<SiteRecord | null> {
    const rows = await this.runQuery(
      `update sites
       set site_key = $2,
           site_key_hash = $3,
           site_key_prefix = $4
       where id = $1
       returning *`,
      [siteId, null, secret.siteKeyHash, secret.siteKeyPrefix],
    );
    return rows[0] ? mapSite(rows[0]) : null;
  }

  async updateSite(record: SiteRecord): Promise<SiteRecord> {
    const rows = await this.runQuery(
      `update sites
       set name = $2,
           site_key_prefix = $3,
           allowed_domains = $4::jsonb,
           status = $5
       where id = $1
       returning *`,
      [
        record.id,
        record.name,
        record.siteKeyPrefix,
        toJson(record.allowedDomains),
        record.status,
      ],
    );
    if (!rows[0]) {
      throw new Error("Site not found.");
    }
    return mapSite(rows[0]);
  }

  async createSiteKeyAudit(record: SiteKeyAuditRecord): Promise<void> {
    await this.runQuery(
      `insert into site_key_audits
       (id, site_id, workspace_id, actor_user_id, action, site_key_prefix, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        record.id,
        record.siteId,
        record.workspaceId,
        record.actorUserId,
        record.action,
        record.siteKeyPrefix,
        record.createdAt,
      ],
    );
  }

  async createConversation(record: ConversationRecord): Promise<ConversationRecord> {
    await this.runQuery(
      `insert into conversations
       (id, workspace_id, bot_id, visitor_id, origin, created_at, status, tags, assignee,
        ai_missing_fields, ai_suggested_questions, ai_high_intent_turn_count)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11::jsonb,$12)`,
      [
        record.id,
        record.workspaceId,
        record.botId,
        record.visitorId,
        record.origin,
        record.createdAt,
        null,
        toJson([]),
        null,
        toJson([]),
        toJson([]),
        0,
      ],
    );
    return record;
  }

  async findConversationById(id: string): Promise<ConversationRecord | null> {
    const rows = await this.runQuery(
      `select * from conversations where id = $1 limit 1`,
      [id],
    );
    return rows[0] ? mapConversation(rows[0]) : null;
  }

  async listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]> {
    const rows = await this.runQuery(
      `select * from conversations
       where workspace_id = $1
       order by created_at desc`,
      [workspaceId],
    );
    return rows.map(mapConversation);
  }

  async listConversationsPage(
    workspaceId: string,
    input: ConversationListQuery,
  ): Promise<{ items: ConversationRecord[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(input.limit, 1), 100);
    const params: unknown[] = [workspaceId];
    const filters: string[] = ["c.workspace_id = $1"];
    let cursorClause = "";

    if (input.botId) {
      params.push(input.botId);
      filters.push(`c.bot_id = $${params.length}`);
    }

    if (input.status) {
      params.push(input.status);
      filters.push(`coalesce(c.status, 'open') = $${params.length}`);
    }

    if (input.hasLead === true) {
      filters.push(
        "exists (select 1 from leads l where l.conversation_id = c.id)",
      );
    } else if (input.hasLead === false) {
      filters.push(
        "not exists (select 1 from leads l where l.conversation_id = c.id)",
      );
    }

    if (input.q) {
      params.push(`%${input.q}%`);
      const qParam = `$${params.length}`;
      const botClause =
        input.qBotIds && input.qBotIds.length > 0
          ? (() => {
              params.push(input.qBotIds);
              return ` or c.bot_id = any($${params.length}::text[])`;
            })()
          : "";
      filters.push(
        `(c.visitor_id ilike ${qParam} or exists (
          select 1 from messages m
          where m.conversation_id = c.id and m.content ilike ${qParam}
        )${botClause})`,
      );
    }

    if (input.cursor) {
      const cursorRows = await this.runQuery<{ created_at?: string }>(
        `select created_at from conversations where id = $1 and workspace_id = $2 limit 1`,
        [input.cursor, workspaceId],
      );
      const cursorCreatedAt = cursorRows[0]?.created_at;
      if (cursorCreatedAt) {
        params.push(cursorCreatedAt, input.cursor);
        cursorClause = `and (c.created_at < $${params.length - 1} or (c.created_at = $${params.length - 1} and c.id < $${params.length}))`;
      }
    }

    params.push(limit + 1);
    const whereClause = filters.join(" and ");
    const rows = await this.runQuery(
      `select c.* from conversations c
       where ${whereClause}
       ${cursorClause}
       order by c.created_at desc, c.id desc
       limit $${params.length}`,
      params,
    );

    const items = rows.slice(0, limit).map(mapConversation);
    const nextCursor = rows.length > limit ? (items.at(-1)?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getConversationMeta(
    conversationId: string,
  ): Promise<ConversationMetaRecord | null> {
    const rows = await this.runQuery(
      `select status, tags, assignee,
              ai_intent, ai_product_line, ai_confidence, ai_missing_fields,
              ai_lead_capture_recommended, ai_suggested_questions,
              ai_high_intent_turn_count, ai_last_evaluated_at, ai_last_lead_prompt_at
       from conversations
       where id = $1
       limit 1`,
      [conversationId],
    );
    if (!rows[0]) {
      return null;
    }

    const meta = mapConversationMeta(rows[0]);
    const hasMeta =
      meta.status !== undefined ||
      (meta.tags?.length ?? 0) > 0 ||
      meta.assignee !== undefined ||
      meta.aiIntent !== null ||
      meta.aiProductLine !== null ||
      meta.aiConfidence !== null ||
      (meta.aiMissingFields?.length ?? 0) > 0 ||
      meta.aiLeadCaptureRecommended !== null ||
      (meta.aiSuggestedQuestions?.length ?? 0) > 0 ||
      (meta.aiHighIntentTurnCount ?? 0) > 0 ||
      meta.aiLastEvaluatedAt !== null ||
      meta.aiLastLeadPromptAt !== null;

    return hasMeta ? meta : null;
  }

  async upsertConversationMeta(
    conversationId: string,
    patch: ConversationMetaRecord,
  ): Promise<ConversationMetaRecord> {
    const current = (await this.getConversationMeta(conversationId)) ?? {};
    const next: ConversationMetaRecord = { ...current, ...patch };

    await this.runQuery(
      `update conversations
       set status = $2,
           tags = $3::jsonb,
           assignee = $4,
           ai_intent = $5,
           ai_product_line = $6,
           ai_confidence = $7,
           ai_missing_fields = $8::jsonb,
           ai_lead_capture_recommended = $9,
           ai_suggested_questions = $10::jsonb,
           ai_high_intent_turn_count = $11,
           ai_last_evaluated_at = $12,
           ai_last_lead_prompt_at = $13
       where id = $1`,
      [
        conversationId,
        next.status ?? null,
        toJson(next.tags ?? []),
        next.assignee ?? null,
        next.aiIntent ?? null,
        next.aiProductLine ?? null,
        next.aiConfidence ?? null,
        toJson(next.aiMissingFields ?? []),
        next.aiLeadCaptureRecommended ?? null,
        toJson(next.aiSuggestedQuestions ?? []),
        next.aiHighIntentTurnCount ?? 0,
        next.aiLastEvaluatedAt ?? null,
        next.aiLastLeadPromptAt ?? null,
      ],
    );

    return next;
  }

  async createMessage(record: MessageRecord): Promise<MessageRecord> {
    await this.runQuery(
      `insert into messages
       (id, workspace_id, bot_id, conversation_id, role, content, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        record.id,
        record.workspaceId,
        record.botId,
        record.conversationId,
        record.role,
        record.content,
        record.createdAt,
      ],
    );
    return record;
  }

  async listMessagesByConversation(conversationId: string): Promise<MessageRecord[]> {
    const rows = await this.runQuery(
      `select * from messages
       where conversation_id = $1
       order by created_at asc`,
      [conversationId],
    );
    return rows.map(mapMessage);
  }

  async createLead(record: LeadRecord): Promise<LeadRecord> {
    const now = record.createdAt;
    await this.runQuery(
      `insert into leads
       (id, workspace_id, bot_id, conversation_id, site_key, fields, attachments, created_at, status, assignee, notes, updated_at,
        key_question, summary, source_site_id, source_site_name)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        record.id,
        record.workspaceId,
        record.botId,
        record.conversationId,
        record.siteKey,
        toJson(record.fields),
        toJson(record.attachments),
        record.createdAt,
        "new",
        null,
        "",
        now,
        record.keyQuestion ?? null,
        record.summary ?? null,
        record.sourceSiteId ?? null,
        record.sourceSiteName ?? null,
      ],
    );
    return record;
  }

  async updateLead(record: LeadRecord): Promise<LeadRecord> {
    const rows = await this.runQuery(
      `update leads
       set fields = $2::jsonb,
           attachments = $3::jsonb,
           key_question = $4,
           summary = $5,
           source_site_id = $6,
           source_site_name = $7
       where id = $1
       returning id`,
      [
        record.id,
        toJson(record.fields),
        toJson(record.attachments),
        record.keyQuestion ?? null,
        record.summary ?? null,
        record.sourceSiteId ?? null,
        record.sourceSiteName ?? null,
      ],
    );
    if (!rows[0]) {
      throw new Error("Lead not found.");
    }
    return record;
  }

  async listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]> {
    const rows = await this.runQuery(
      `select id, workspace_id, bot_id, conversation_id, site_key, fields, attachments, created_at,
              key_question, summary, source_site_id, source_site_name
       from leads
       where workspace_id = $1
       order by created_at desc`,
      [workspaceId],
    );
    return rows.map(mapLead);
  }

  async findLeadByConversation(conversationId: string): Promise<LeadRecord | null> {
    const rows = await this.runQuery(
      `select id, workspace_id, bot_id, conversation_id, site_key, fields, attachments, created_at,
              key_question, summary, source_site_id, source_site_name
       from leads
       where conversation_id = $1
       limit 1`,
      [conversationId],
    );
    return rows[0] ? mapLead(rows[0]) : null;
  }

  async findLeadById(id: string): Promise<LeadRecord | null> {
    const rows = await this.runQuery(
      `select id, workspace_id, bot_id, conversation_id, site_key, fields, attachments, created_at,
              key_question, summary, source_site_id, source_site_name
       from leads
       where id = $1
       limit 1`,
      [id],
    );
    return rows[0] ? mapLead(rows[0]) : null;
  }

  async getLeadMeta(leadId: string): Promise<LeadMetaRecord | null> {
    const rows = await this.runQuery(
      `select id, status, assignee, notes, updated_at, follow_up_records from leads where id = $1 limit 1`,
      [leadId],
    );
    return rows[0] ? mapLeadMeta(rows[0]) : null;
  }

  async upsertLeadMeta(record: LeadMetaRecord): Promise<LeadMetaRecord> {
    const rows = await this.runQuery(
      `update leads
       set status = $2,
           assignee = $3,
           notes = $4,
           updated_at = $5,
           follow_up_records = $6::jsonb
       where id = $1
       returning id, status, assignee, notes, updated_at, follow_up_records`,
      [
        record.leadId,
        record.status,
        record.assignee,
        record.notes,
        record.updatedAt,
        toJson(record.followUpRecords ?? []),
      ],
    );
    if (!rows[0]) {
      throw new Error("Lead not found.");
    }
    return mapLeadMeta(rows[0]);
  }

  async withTransaction<T>(fn: (repository: ChatRepository) => Promise<T>): Promise<T> {
    return withTransaction(async (client) => {
      const repository = new PostgresChatRepository(createClientQuery(client));
      return fn(repository);
    });
  }
}
