import { query } from "../db/pg";
import type { SalesRepository } from "./sales.repository";
import type {
  BusinessRulesPayload,
  BusinessRulesRecord,
  InquiryRecord,
  QuotePublicLinkRecord,
  QuoteFollowUpRecord,
  QuoteOpportunityRecord,
  QuoteLineItem,
  QuoteTemplateRecord,
  QuoteTemplateTerms,
  SourceCodeRecord,
} from "./sales.types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = asString(value).trim();
  return text.length > 0 ? text : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)) : [];
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = asString(item);
  }
  return result;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asQuoteLineItems(value: unknown): QuoteLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    return [{
      name: asString(row.name),
      model: asString(row.model),
      unit: asString(row.unit),
      qty: Number(row.qty ?? 0),
      price: Number(row.price ?? 0),
      discount: Number(row.discount ?? 0),
      ...(asNullableString(row.deliveryCycle) ? { deliveryCycle: asNullableString(row.deliveryCycle)! } : {}),
    }];
  });
}

function normalizeDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(asString(value)).toISOString();
}

function toJson<T>(value: T): string {
  return JSON.stringify(value);
}

function mapInquiry(row: Record<string, unknown>): InquiryRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    conversationId: asString(row.conversation_id),
    leadId: asNullableString(row.lead_id),
    botId: asString(row.bot_id),
    sourceCode: asNullableString(row.source_code),
    sourceType: asString(row.source_type) as InquiryRecord["sourceType"],
    intentLevel: asString(row.intent_level) as InquiryRecord["intentLevel"],
    requirementCompleteness: Number(row.requirement_completeness ?? 0),
    needsEngineer: Boolean(row.needs_engineer),
    summary: asNullableString(row.summary),
    missingFields: asStringArray(row.missing_fields),
    riskNotes: asStringArray(row.risk_notes),
    knownFields: asRecord(row.known_fields),
    ownerId: asNullableString(row.owner_id),
    nextActionAt: row.next_action_at ? normalizeDate(row.next_action_at) : null,
    quoteStatus: asString(row.quote_status) as InquiryRecord["quoteStatus"],
    status: asString(row.status) as InquiryRecord["status"],
    customerName: asNullableString(row.customer_name),
    customerContact: asNullableString(row.customer_contact),
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapQuoteTemplateTerms(value: unknown): QuoteTemplateTerms {
  const record = asRecord(value);
  return {
    payment: record.payment ?? "",
    delivery: record.delivery ?? "",
    validity: record.validity ?? "",
  };
}

function mapQuoteTemplate(row: Record<string, unknown>): QuoteTemplateRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    templateName: asString(row.template_name),
    companyName: asString(row.company_name),
    description: asString(row.description),
    themeColor: asString(row.theme_color),
    logoPosition: asString(row.logo_position) as QuoteTemplateRecord["logoPosition"],
    showCompanyInfo: row.show_company_info !== false,
    showCustomerInfo: row.show_customer_info !== false,
    fields: asStringArray(row.fields),
    terms: mapQuoteTemplateTerms(row.terms),
    isDefault: row.is_default === true,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapQuote(row: Record<string, unknown>): QuoteOpportunityRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    inquiryId: asString(row.inquiry_id),
    templateId: asNullableString(row.template_id),
    lineItems: asQuoteLineItems(row.line_items),
    taxRate: asNumber(row.tax_rate) ?? 0.13,
    freightAmount: asNumber(row.freight_amount) ?? 0,
    installationAmount: asNumber(row.installation_amount) ?? 0,
    otherAmount: asNumber(row.other_amount) ?? 0,
    currency: asString(row.currency) || "CNY",
    stage: asString(row.stage) as QuoteOpportunityRecord["stage"],
    estimatedAmount: asNumber(row.estimated_amount),
    quotedAmount: asNumber(row.quoted_amount),
    wonAmount: asNumber(row.won_amount),
    lostReason: asNullableString(row.lost_reason) as QuoteOpportunityRecord["lostReason"],
    quoteDueAt: row.quote_due_at ? normalizeDate(row.quote_due_at) : null,
    ownerId: asNullableString(row.owner_id),
    nextFollowUpAt: row.next_follow_up_at ? normalizeDate(row.next_follow_up_at) : null,
    title: asNullableString(row.title),
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapFollowUp(row: Record<string, unknown>): QuoteFollowUpRecord {
  return {
    id: asString(row.id),
    quoteOpportunityId: asString(row.quote_opportunity_id),
    kind: asString(row.kind) as QuoteFollowUpRecord["kind"],
    title: asString(row.title),
    body: asNullableString(row.body),
    actor: asNullableString(row.actor),
    createdAt: normalizeDate(row.created_at),
  };
}

function mapQuotePublicLink(row: Record<string, unknown>): QuotePublicLinkRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    quoteOpportunityId: asString(row.quote_opportunity_id),
    tokenHash: asString(row.token_hash),
    tokenPrefix: asString(row.token_prefix),
    status: asString(row.status) as QuotePublicLinkRecord["status"],
    createdBy: asNullableString(row.created_by),
    createdAt: normalizeDate(row.created_at),
    lastAccessedAt: row.last_accessed_at ? normalizeDate(row.last_accessed_at) : null,
    confirmedAt: row.confirmed_at ? normalizeDate(row.confirmed_at) : null,
  };
}

function mapSource(row: Record<string, unknown>): SourceCodeRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    code: asString(row.code),
    label: asString(row.label),
    sourceType: asString(row.source_type) as SourceCodeRecord["sourceType"],
    status: asString(row.status) as SourceCodeRecord["status"],
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapRules(row: Record<string, unknown>): BusinessRulesRecord {
  const rules =
    row.rules && typeof row.rules === "object" && !Array.isArray(row.rules)
      ? (row.rules as BusinessRulesPayload)
      : ({} as BusinessRulesPayload);
  return {
    workspaceId: asString(row.workspace_id),
    rules,
    updatedAt: normalizeDate(row.updated_at),
  };
}

export class PostgresSalesRepository implements SalesRepository {
  async listInquiries(
    workspaceId: string,
    ownerId?: string | null,
  ): Promise<InquiryRecord[]> {
    const rows = await query(
      `select * from inquiries where workspace_id = $1${
        ownerId ? " and owner_id = $2" : ""
      } order by updated_at desc`,
      ownerId ? [workspaceId, ownerId] : [workspaceId],
    );
    return rows.map(mapInquiry);
  }

  async findInquiryById(
    workspaceId: string,
    id: string,
  ): Promise<InquiryRecord | null> {
    const rows = await query(
      `select * from inquiries where workspace_id = $1 and id = $2`,
      [workspaceId, id],
    );
    return rows[0] ? mapInquiry(rows[0]) : null;
  }

  async upsertInquiry(record: InquiryRecord): Promise<InquiryRecord> {
    await query(
      `insert into inquiries (
         id, workspace_id, conversation_id, lead_id, bot_id, source_code, source_type,
         intent_level, requirement_completeness, needs_engineer, summary,
         missing_fields, risk_notes, known_fields, owner_id, next_action_at,
         quote_status, status, customer_name, customer_contact, created_at, updated_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17,$18,$19,$20,$21,$22
       )
       on conflict (id) do update set
         lead_id = excluded.lead_id,
         source_code = excluded.source_code,
         source_type = excluded.source_type,
         intent_level = excluded.intent_level,
         requirement_completeness = excluded.requirement_completeness,
         needs_engineer = excluded.needs_engineer,
         summary = excluded.summary,
         missing_fields = excluded.missing_fields,
         risk_notes = excluded.risk_notes,
         known_fields = excluded.known_fields,
         owner_id = excluded.owner_id,
         next_action_at = excluded.next_action_at,
         quote_status = excluded.quote_status,
         status = excluded.status,
         customer_name = excluded.customer_name,
         customer_contact = excluded.customer_contact,
         updated_at = excluded.updated_at`,
      [
        record.id,
        record.workspaceId,
        record.conversationId,
        record.leadId,
        record.botId,
        record.sourceCode,
        record.sourceType,
        record.intentLevel,
        record.requirementCompleteness,
        record.needsEngineer,
        record.summary,
        toJson(record.missingFields),
        toJson(record.riskNotes),
        toJson(record.knownFields),
        record.ownerId,
        record.nextActionAt,
        record.quoteStatus,
        record.status,
        record.customerName,
        record.customerContact,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateInquiry(
    workspaceId: string,
    id: string,
    patch: Partial<InquiryRecord>,
  ): Promise<InquiryRecord | null> {
    const current = await this.findInquiryById(workspaceId, id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
    return this.upsertInquiry(next);
  }

  async listQuoteOpportunities(
    workspaceId: string,
    ownerId?: string | null,
  ): Promise<QuoteOpportunityRecord[]> {
    const rows = await query(
      `select * from quote_opportunities where workspace_id = $1${
        ownerId ? " and owner_id = $2" : ""
      } order by updated_at desc`,
      ownerId ? [workspaceId, ownerId] : [workspaceId],
    );
    return rows.map(mapQuote);
  }

  async findQuoteOpportunityById(
    workspaceId: string,
    id: string,
  ): Promise<QuoteOpportunityRecord | null> {
    const rows = await query(
      `select * from quote_opportunities where workspace_id = $1 and id = $2`,
      [workspaceId, id],
    );
    return rows[0] ? mapQuote(rows[0]) : null;
  }

  async listQuoteOpportunitiesByInquiry(inquiryId: string): Promise<QuoteOpportunityRecord[]> {
    const rows = await query(
      `select * from quote_opportunities where inquiry_id = $1 order by updated_at desc`,
      [inquiryId],
    );
    return rows.map(mapQuote);
  }

  async createQuoteOpportunity(record: QuoteOpportunityRecord): Promise<QuoteOpportunityRecord> {
    await query(
      `insert into quote_opportunities (
         id, workspace_id, inquiry_id, template_id, line_items, tax_rate, freight_amount,
         installation_amount, other_amount, currency, stage, estimated_amount, quoted_amount, won_amount,
         lost_reason, quote_due_at, owner_id, next_follow_up_at, title, created_at, updated_at
       ) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        record.id,
        record.workspaceId,
        record.inquiryId,
        record.templateId,
        toJson(record.lineItems),
        record.taxRate,
        record.freightAmount,
        record.installationAmount,
        record.otherAmount,
        record.currency,
        record.stage,
        record.estimatedAmount,
        record.quotedAmount,
        record.wonAmount,
        record.lostReason,
        record.quoteDueAt,
        record.ownerId,
        record.nextFollowUpAt,
        record.title,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateQuoteOpportunity(
    workspaceId: string,
    id: string,
    patch: Partial<QuoteOpportunityRecord>,
  ): Promise<QuoteOpportunityRecord | null> {
    const current = await this.findQuoteOpportunityById(workspaceId, id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
    await query(
      `update quote_opportunities set
         template_id = $2,
         line_items = $3::jsonb,
         tax_rate = $4,
         freight_amount = $5,
         installation_amount = $6,
         other_amount = $7,
         currency = $8,
         stage = $9,
         estimated_amount = $10,
         quoted_amount = $11,
         won_amount = $12,
         lost_reason = $13,
         quote_due_at = $14,
         owner_id = $15,
         next_follow_up_at = $16,
         title = $17,
         updated_at = $18
       where id = $1 and workspace_id = $19`,
      [
        next.id,
        next.templateId,
        toJson(next.lineItems),
        next.taxRate,
        next.freightAmount,
        next.installationAmount,
        next.otherAmount,
        next.currency,
        next.stage,
        next.estimatedAmount,
        next.quotedAmount,
        next.wonAmount,
        next.lostReason,
        next.quoteDueAt,
        next.ownerId,
        next.nextFollowUpAt,
        next.title,
        next.updatedAt,
        workspaceId,
      ],
    );
    return next;
  }

  async listQuoteFollowUps(quoteOpportunityId: string): Promise<QuoteFollowUpRecord[]> {
    const rows = await query(
      `select * from quote_follow_ups where quote_opportunity_id = $1 order by created_at desc`,
      [quoteOpportunityId],
    );
    return rows.map(mapFollowUp);
  }

  async createQuoteFollowUp(record: QuoteFollowUpRecord): Promise<QuoteFollowUpRecord> {
    await query(
      `insert into quote_follow_ups (id, quote_opportunity_id, kind, title, body, actor, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        record.id,
        record.quoteOpportunityId,
        record.kind,
        record.title,
        record.body ?? null,
        record.actor ?? null,
        record.createdAt,
      ],
    );
    return record;
  }

  async findQuotePublicLinkByQuoteId(
    workspaceId: string,
    quoteOpportunityId: string,
  ): Promise<QuotePublicLinkRecord | null> {
    const rows = await query(
      `select * from quote_public_links
       where workspace_id = $1 and quote_opportunity_id = $2 and status = 'active'
       limit 1`,
      [workspaceId, quoteOpportunityId],
    );
    return rows[0] ? mapQuotePublicLink(rows[0]) : null;
  }

  async findQuotePublicLinkByTokenHash(tokenHash: string): Promise<QuotePublicLinkRecord | null> {
    const rows = await query(
      `select * from quote_public_links where token_hash = $1 and status = 'active' limit 1`,
      [tokenHash],
    );
    return rows[0] ? mapQuotePublicLink(rows[0]) : null;
  }

  async upsertQuotePublicLink(record: QuotePublicLinkRecord): Promise<QuotePublicLinkRecord> {
    await query(
      `insert into quote_public_links (
         id, workspace_id, quote_opportunity_id, token_hash, token_prefix, status,
         created_by, created_at, last_accessed_at, confirmed_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (quote_opportunity_id) do update set
         token_hash = excluded.token_hash,
         token_prefix = excluded.token_prefix,
         status = excluded.status,
         created_by = excluded.created_by,
         created_at = excluded.created_at,
         last_accessed_at = excluded.last_accessed_at,
         confirmed_at = excluded.confirmed_at`,
      [
        record.id,
        record.workspaceId,
        record.quoteOpportunityId,
        record.tokenHash,
        record.tokenPrefix,
        record.status,
        record.createdBy,
        record.createdAt,
        record.lastAccessedAt,
        record.confirmedAt,
      ],
    );
    return record;
  }

  async touchQuotePublicLinkAccess(
    id: string,
    patch: Pick<QuotePublicLinkRecord, "lastAccessedAt" | "confirmedAt" | "status">,
  ): Promise<QuotePublicLinkRecord | null> {
    const rows = await query(
      `update quote_public_links set
         last_accessed_at = $2,
         confirmed_at = $3,
         status = $4
       where id = $1
       returning *`,
      [id, patch.lastAccessedAt, patch.confirmedAt, patch.status],
    );
    return rows[0] ? mapQuotePublicLink(rows[0]) : null;
  }

  async listSourceCodes(workspaceId: string): Promise<SourceCodeRecord[]> {
    const rows = await query(
      `select * from source_codes where workspace_id = $1 order by label asc`,
      [workspaceId],
    );
    return rows.map(mapSource);
  }

  async createSourceCode(record: SourceCodeRecord): Promise<SourceCodeRecord> {
    await query(
      `insert into source_codes (id, workspace_id, code, label, source_type, status, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        record.id,
        record.workspaceId,
        record.code,
        record.label,
        record.sourceType,
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async findSourceCodeByCode(
    workspaceId: string,
    code: string,
  ): Promise<SourceCodeRecord | null> {
    const rows = await query(
      `select * from source_codes where workspace_id = $1 and lower(code) = lower($2) limit 1`,
      [workspaceId, code.trim()],
    );
    return rows[0] ? mapSource(rows[0]) : null;
  }

  async getBusinessRules(workspaceId: string): Promise<BusinessRulesRecord | null> {
    const rows = await query(`select * from business_rules where workspace_id = $1`, [
      workspaceId,
    ]);
    return rows[0] ? mapRules(rows[0]) : null;
  }

  async upsertBusinessRules(record: BusinessRulesRecord): Promise<BusinessRulesRecord> {
    await query(
      `insert into business_rules (workspace_id, rules, updated_at)
       values ($1, $2::jsonb, $3)
       on conflict (workspace_id) do update set
         rules = excluded.rules,
         updated_at = excluded.updated_at`,
      [record.workspaceId, toJson(record.rules), record.updatedAt],
    );
    return record;
  }

  async listQuoteTemplates(workspaceId: string): Promise<QuoteTemplateRecord[]> {
    const rows = await query(
      `select * from quote_templates where workspace_id = $1 order by is_default desc, updated_at desc`,
      [workspaceId],
    );
    return rows.map(mapQuoteTemplate);
  }

  async findQuoteTemplateById(
    workspaceId: string,
    id: string,
  ): Promise<QuoteTemplateRecord | null> {
    const rows = await query(
      `select * from quote_templates where workspace_id = $1 and id = $2`,
      [workspaceId, id],
    );
    return rows[0] ? mapQuoteTemplate(rows[0]) : null;
  }

  async findDefaultQuoteTemplate(workspaceId: string): Promise<QuoteTemplateRecord | null> {
    const rows = await query(
      `select * from quote_templates where workspace_id = $1 and is_default = true limit 1`,
      [workspaceId],
    );
    return rows[0] ? mapQuoteTemplate(rows[0]) : null;
  }

  async createQuoteTemplate(record: QuoteTemplateRecord): Promise<QuoteTemplateRecord> {
    await query(
      `insert into quote_templates (
         id, workspace_id, template_name, company_name, description, theme_color,
         logo_position, show_company_info, show_customer_info, fields, terms,
         is_default, created_at, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14)`,
      [
        record.id,
        record.workspaceId,
        record.templateName,
        record.companyName,
        record.description,
        record.themeColor,
        record.logoPosition,
        record.showCompanyInfo,
        record.showCustomerInfo,
        toJson(record.fields),
        toJson(record.terms),
        record.isDefault,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateQuoteTemplate(
    workspaceId: string,
    id: string,
    patch: Partial<QuoteTemplateRecord>,
  ): Promise<QuoteTemplateRecord | null> {
    const current = await this.findQuoteTemplateById(workspaceId, id);
    if (!current) {
      return null;
    }
    const next = {
      ...current,
      ...patch,
      id: current.id,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };
    await query(
      `update quote_templates set
         template_name = $2,
         company_name = $3,
         description = $4,
         theme_color = $5,
         logo_position = $6,
         show_company_info = $7,
         show_customer_info = $8,
         fields = $9::jsonb,
         terms = $10::jsonb,
         is_default = $11,
         updated_at = $12
       where id = $1 and workspace_id = $13`,
      [
        next.id,
        next.templateName,
        next.companyName,
        next.description,
        next.themeColor,
        next.logoPosition,
        next.showCompanyInfo,
        next.showCustomerInfo,
        toJson(next.fields),
        toJson(next.terms),
        next.isDefault,
        next.updatedAt,
        workspaceId,
      ],
    );
    return next;
  }

  async deleteQuoteTemplate(workspaceId: string, id: string): Promise<boolean> {
    const rows = await query(
      `delete from quote_templates where workspace_id = $1 and id = $2 returning id`,
      [workspaceId, id],
    );
    return rows.length > 0;
  }

  async clearDefaultQuoteTemplate(workspaceId: string, exceptId?: string): Promise<void> {
    if (exceptId) {
      await query(
        `update quote_templates set is_default = false where workspace_id = $1 and id <> $2 and is_default = true`,
        [workspaceId, exceptId],
      );
      return;
    }
    await query(
      `update quote_templates set is_default = false where workspace_id = $1 and is_default = true`,
      [workspaceId],
    );
  }
}
