import type { ConversationMetaRecord } from "./chat.repository";
import type {
  ConversationRecord,
  LeadAttachmentRecord,
  LeadFollowUpRecord,
  LeadMetaRecord,
  LeadRecord,
  LeadStatus,
  MessageRecord,
  SiteRecord,
} from "./chat.types";

type QueryResultRow = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : asString(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)) : [];
}

function asRecordString(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, asString(entry)]),
  );
}

function asLeadAttachments(value: unknown): LeadAttachmentRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const record = item as Record<string, unknown>;
      const statusRaw = asString(record.status);
      const status: LeadAttachmentRecord["status"] =
        statusRaw === "failed" || statusRaw === "pending" ? statusRaw : "ready";
      return {
        id: asString(record.id),
        leadId: asString(record.leadId),
        fileName: asString(record.fileName),
        fileType: asString(record.fileType),
        sizeBytes: Number(record.sizeBytes ?? 0),
        storageKey: asString(record.storageKey),
        checksum: asString(record.checksum || "") || undefined,
        createdAt: normalizeDate(record.createdAt as Date | string)!,
        status,
        errorMessage: asString(record.errorMessage || "") || undefined,
      };
    });
}

function asLeadFollowUpRecords(value: unknown): LeadFollowUpRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const record = item as Record<string, unknown>;
      const kindRaw = asString(record.kind);
      const kind: LeadFollowUpRecord["kind"] =
        kindRaw === "status" || kindRaw === "assignee" || kindRaw === "system"
          ? kindRaw
          : "note";
      return {
        id: asString(record.id),
        kind,
        title: asString(record.title),
        body: asString(record.body || "") || undefined,
        actor: asNullableString(record.actor),
        createdAt: normalizeDate(record.createdAt as Date | string)!,
      };
    })
    .filter((record) => record.title);
}

function normalizeDate(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeLeadStatus(value: unknown): LeadStatus {
  const raw = asString(value);
  switch (raw) {
    case "following":
      return "pending";
    case "new":
    case "pending":
    case "contacted":
    case "proposal":
    case "won":
    case "invalid":
      return raw;
    default:
      return "new";
  }
}

export function mapSite(row: QueryResultRow): SiteRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    botId: asString(row.bot_id),
    name: asString(row.name),
    siteKeyPrefix: asString(row.site_key_prefix),
    allowedDomains: asStringArray(row.allowed_domains),
    status: asString(row.status) as SiteRecord["status"],
  };
}

export function mapConversation(row: QueryResultRow): ConversationRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    botId: asString(row.bot_id),
    visitorId: asString(row.visitor_id),
    origin: asString(row.origin),
    createdAt: normalizeDate(row.created_at as Date | string)!,
  };
}

export function mapConversationMeta(row: QueryResultRow): ConversationMetaRecord {
  return {
    status: row.status ? (asString(row.status) as ConversationMetaRecord["status"]) : undefined,
    tags: asStringArray(row.tags),
    assignee: asNullableString(row.assignee),
    aiIntent: asNullableString(row.ai_intent),
    aiProductLine: asNullableString(row.ai_product_line),
    aiConfidence:
      typeof row.ai_confidence === "number"
        ? row.ai_confidence
        : row.ai_confidence === null || row.ai_confidence === undefined
          ? null
          : Number(row.ai_confidence),
    aiMissingFields: asStringArray(row.ai_missing_fields),
    aiLeadCaptureRecommended:
      typeof row.ai_lead_capture_recommended === "boolean"
        ? row.ai_lead_capture_recommended
        : row.ai_lead_capture_recommended === null || row.ai_lead_capture_recommended === undefined
          ? null
          : Boolean(row.ai_lead_capture_recommended),
    aiSuggestedQuestions: asStringArray(row.ai_suggested_questions),
    aiHighIntentTurnCount:
      typeof row.ai_high_intent_turn_count === "number"
        ? row.ai_high_intent_turn_count
        : Number(row.ai_high_intent_turn_count ?? 0),
    aiLastEvaluatedAt: normalizeDate(row.ai_last_evaluated_at as Date | string | null),
    aiLastLeadPromptAt: normalizeDate(row.ai_last_lead_prompt_at as Date | string | null),
  };
}

export function mapMessage(row: QueryResultRow): MessageRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    botId: asString(row.bot_id),
    conversationId: asString(row.conversation_id),
    role: asString(row.role) as MessageRecord["role"],
    content: asString(row.content),
    createdAt: normalizeDate(row.created_at as Date | string)!,
  };
}

export function mapLead(row: QueryResultRow): LeadRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    botId: asString(row.bot_id),
    conversationId: asString(row.conversation_id),
    siteKey: asString(row.site_key),
    fields: asRecordString(row.fields),
    createdAt: normalizeDate(row.created_at as Date | string)!,
    attachments: asLeadAttachments(row.attachments),
    keyQuestion: asNullableString(row.key_question),
    summary: asNullableString(row.summary),
    sourceSiteId: asNullableString(row.source_site_id),
    sourceSiteName: asNullableString(row.source_site_name),
  };
}

export function mapLeadMeta(row: QueryResultRow): LeadMetaRecord {
  return {
    leadId: asString(row.id),
    status: normalizeLeadStatus(row.status),
    assignee: asNullableString(row.assignee),
    notes: asString(row.notes),
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
    followUpRecords: asLeadFollowUpRecords(row.follow_up_records),
  };
}

export function toJson<T>(value: T): string {
  return JSON.stringify(value);
}
