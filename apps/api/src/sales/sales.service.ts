import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AnalyticsQuery } from "../analytics/analytics-query";
import type { WorkspaceMemberSummary } from "../auth/auth.types";
import { isWithinAnalyticsRange } from "../analytics/analytics-query";
import type { ChatRepository } from "../chat/chat.repository";
import { isHighIntentConversation } from "../chat/intent-labels";
import type { LeadRecord, MessageRecord } from "../chat/chat.types";
import type { RagRepository } from "../rag/rag.repository";
import {
  analyzeSalesContent,
  buildRequirementSheetMarkdown,
} from "./sales-assistant.service";
import { buildInquiryAssignCandidates } from "./inquiry-assign-recommendation";
import {
  buildDefaultQuoteTemplateRecord,
  buildQuotePreviewSampleFromOpportunity,
  mapQuoteTemplateResponse,
} from "./quote-template-preview";
import { renderQuoteTemplateHtml } from "./quote-template-html";
import {
  defaultBusinessRulesPayload,
  type SalesRepository,
} from "./sales.repository";
import type {
  BusinessRulesPayload,
  ChannelAttributionItem,
  ConversionFunnelStep,
  CustomerOperationRecommendation,
  CustomerOpportunityItem,
  CreateInquiryInput,
  InquiryAssignCandidate,
  InquiryAssignStats,
  InquiryRecord,
  IntentLevel,
  LostReason,
  QuoteDocumentPayload,
  QuoteFollowUpRecord,
  QuoteOpportunityRecord,
  QuoteStage,
  QuoteTemplateRecord,
  QuoteTemplateTerms,
  SalesOverviewMetrics,
  SourceAnalyticsItem,
  SourceType,
} from "./sales.types";

export class SalesAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesAccessError";
  }
}

export class SalesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesValidationError";
  }
}

const QUOTE_STAGE_LABELS: Record<QuoteStage, string> = {
  collecting: "待补资料",
  engineering_review: "待工程确认",
  to_quote: "待报价",
  quoted: "已报价",
  confirming: "客户确认中",
  won: "已成交",
  lost: "已丢单",
};

/**
 * 数据范围解析（对应文档 data_scope）：
 * - owner / admin 看企业全部数据（all）
 * - member / viewer 仅看自己 owner_id = userId 的数据（self）
 * 返回需要追加到查询的 ownerId；为 null 表示不限制。
 */
function resolveOwnerScope(
  scope?: { role: import("../auth/auth.types").WorkspaceMemberRole; userId: string },
): string | null {
  if (!scope) return null;
  if (scope.role === "owner" || scope.role === "admin") return null;
  return scope.userId;
}

export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly chatRepository: ChatRepository,
    private readonly ragRepository: RagRepository,
  ) {}

  async getBusinessRules(workspaceId: string) {
    const record = await this.salesRepository.getBusinessRules(workspaceId);
    return record?.rules ?? defaultBusinessRulesPayload();
  }

  async updateBusinessRules(workspaceId: string, patch: Partial<BusinessRulesPayload>) {
    const current = await this.getBusinessRules(workspaceId);
    const next = { ...current, ...patch };
    await this.salesRepository.upsertBusinessRules({
      workspaceId,
      rules: next,
      updatedAt: new Date().toISOString(),
    });
    return next;
  }

  async syncWorkspaceInquiries(workspaceId: string): Promise<void> {
    const rules = await this.getBusinessRules(workspaceId);
    const leads = await this.chatRepository.listLeadsByWorkspace(workspaceId);
    const seenConversations = new Set<string>();

    for (const lead of leads) {
      seenConversations.add(lead.conversationId);
      await this.syncInquiryFromLead(workspaceId, lead, rules);
    }

    const conversations = await this.chatRepository.listConversationsByWorkspace(workspaceId);
    for (const conversation of conversations) {
      if (seenConversations.has(conversation.id)) {
        continue;
      }
      const meta = await this.chatRepository.getConversationMeta(conversation.id);
      if (!isHighIntentConversation(meta)) {
        continue;
      }
      const messages = await this.chatRepository.listMessagesByConversation(conversation.id);
      await this.syncInquiryFromConversation({
        workspaceId,
        conversationId: conversation.id,
        botId: conversation.botId,
        origin: conversation.origin,
        lead: null,
        messages,
        meta,
        rules,
      });
    }
  }

  private async syncInquiryFromLead(
    workspaceId: string,
    lead: LeadRecord,
    rules: BusinessRulesPayload,
  ): Promise<InquiryRecord> {
    const conversation = await this.chatRepository.findConversationById(
      workspaceId,
      lead.conversationId,
    );
    const meta = await this.chatRepository.getConversationMeta(lead.conversationId);
    const messages = await this.chatRepository.listMessagesByConversation(lead.conversationId);
    return this.syncInquiryFromConversation({
      workspaceId,
      conversationId: lead.conversationId,
      botId: lead.botId,
      origin: conversation?.origin ?? "",
      lead,
      messages,
      meta,
      rules,
    });
  }

  private async syncInquiryFromConversation(input: {
    workspaceId: string;
    conversationId: string;
    botId: string;
    origin: string;
    lead: LeadRecord | null;
    messages: MessageRecord[];
    meta: Awaited<ReturnType<ChatRepository["getConversationMeta"]>>;
    rules: BusinessRulesPayload;
  }): Promise<InquiryRecord> {
    const id = `inq_${input.conversationId}`;
    const existing = await this.salesRepository.findInquiryById(input.workspaceId, id);
    const now = new Date().toISOString();
    const transcript = input.messages.map((item) => item.content).join("\n");
    const knownFields = this.extractKnownFields(input.lead, input.meta);
    const missingFields = this.computeMissingFields(knownFields, input.rules, input.meta);
    const completeness = this.computeCompleteness(knownFields, input.rules.requiredQuoteFields);
    const intentLevel = this.resolveIntentLevel(input.meta, transcript, input.rules, input.lead);
    const needsEngineer = this.resolveNeedsEngineer(transcript, missingFields, input.meta);
    const summary =
      input.lead?.summary ??
      input.lead?.keyQuestion ??
      [...input.messages].reverse().find((item) => item.role === "user")?.content ??
      null;
    const customerName = input.lead?.fields.name?.trim() || "访客";
    const customerContact =
      input.lead?.fields.phone?.trim() ||
      input.lead?.fields.email?.trim() ||
      input.lead?.fields.company?.trim() ||
      null;
    const source = this.resolveSource(input.origin, input.lead);
    const quoteStatus = existing?.quoteStatus ?? "none";
    const quotes = await this.salesRepository.listQuoteOpportunitiesByInquiry(id);
    const activeQuote = quotes[0];

    const record: InquiryRecord = {
      id,
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      leadId: input.lead?.id ?? existing?.leadId ?? null,
      botId: input.botId,
      sourceCode: existing?.sourceCode ?? source.sourceCode,
      sourceType: existing?.sourceType ?? source.sourceType,
      intentLevel,
      requirementCompleteness: completeness,
      needsEngineer,
      summary,
      missingFields,
      riskNotes: this.buildRiskNotes(transcript),
      knownFields,
      ownerId: existing?.ownerId ?? null,
      nextActionAt: activeQuote?.nextFollowUpAt ?? existing?.nextActionAt ?? null,
      quoteStatus: activeQuote?.stage ?? quoteStatus,
      status: existing?.status ?? "open",
      customerName,
      customerContact,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    return this.salesRepository.upsertInquiry(record);
  }

  private extractKnownFields(
    lead: LeadRecord | null,
    meta: Awaited<ReturnType<ChatRepository["getConversationMeta"]>>,
  ): Record<string, string> {
    const fields: Record<string, string> = {};
    if (lead?.fields) {
      for (const [key, value] of Object.entries(lead.fields)) {
        if (value?.trim()) {
          fields[key] = value.trim();
        }
      }
    }
    if (meta?.aiProductLine) {
      fields.productType = meta.aiProductLine;
    }
    return fields;
  }

  private computeMissingFields(
    knownFields: Record<string, string>,
    rules: BusinessRulesPayload,
    meta: Awaited<ReturnType<ChatRepository["getConversationMeta"]>>,
  ): string[] {
    const missing = new Set<string>();
    for (const field of rules.requiredQuoteFields) {
      if (!knownFields[field]?.trim()) {
        missing.add(field);
      }
    }
    for (const field of meta?.aiMissingFields ?? []) {
      if (field?.trim()) {
        missing.add(field.trim());
      }
    }
    return [...missing];
  }

  private computeCompleteness(
    knownFields: Record<string, string>,
    requiredFields: string[],
  ): number {
    if (requiredFields.length === 0) {
      return 0;
    }
    const filled = requiredFields.filter((field) => knownFields[field]?.trim()).length;
    return Math.min(100, Math.round((filled / requiredFields.length) * 100));
  }

  private resolveIntentLevel(
    meta: Awaited<ReturnType<ChatRepository["getConversationMeta"]>>,
    transcript: string,
    rules: BusinessRulesPayload,
    lead: LeadRecord | null,
  ): IntentLevel {
    if (isHighIntentConversation(meta)) {
      return "high";
    }
    const lower = transcript.toLowerCase();
    if (rules.highIntentKeywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return "high";
    }
    if (lead || meta?.aiIntent) {
      return "medium";
    }
    return "low";
  }

  private resolveNeedsEngineer(
    transcript: string,
    missingFields: string[],
    meta: Awaited<ReturnType<ChatRepository["getConversationMeta"]>>,
  ): boolean {
    if (/图纸|cad|pdf|非标|定制|防腐|ip\d+|认证/u.test(transcript)) {
      return true;
    }
    if (missingFields.some((field) => /drawing|dimensions|environment/i.test(field))) {
      return true;
    }
    return (meta?.aiMissingFields ?? []).some((field) =>
      /图纸|尺寸|环境|认证|防护/.test(field),
    );
  }

  private buildRiskNotes(transcript: string): string[] {
    const notes: string[] = [];
    if (/价格|报价|多少钱/u.test(transcript)) {
      notes.push("客户询问价格，需人工确认后报价。");
    }
    if (/交期|交付/u.test(transcript)) {
      notes.push("涉及交期，需计划或销售确认。");
    }
    return notes;
  }

  private resolveSource(
    origin: string,
    lead: LeadRecord | null,
  ): { sourceCode: string | null; sourceType: SourceType } {
    if (lead?.sourceSiteName) {
      return { sourceCode: lead.sourceSiteId ?? null, sourceType: "website" };
    }
    const lower = origin.toLowerCase();
    if (lower.includes("douyin")) {
      return { sourceCode: null, sourceType: "douyin" };
    }
    if (lower.includes("wechat") || lower.includes("wx")) {
      return { sourceCode: null, sourceType: "wechat" };
    }
    if (lower.includes("expo")) {
      return { sourceCode: null, sourceType: "expo" };
    }
    if (origin.trim()) {
      return { sourceCode: null, sourceType: "website" };
    }
    return { sourceCode: null, sourceType: "other" };
  }

  /**
   * Console-side inquiry creation (manual entry, no conversation required).
   */
  async createInquiry(workspaceId: string, input: CreateInquiryInput) {
    const rules = await this.getBusinessRules(workspaceId);
    const now = new Date().toISOString();
    const knownFields: Record<string, string> = { ...(input.knownFields ?? {}) };

    if (input.phone?.trim()) knownFields.phone = input.phone.trim();
    if (input.email?.trim()) knownFields.email = input.email.trim();
    if (input.customerContact?.trim()) knownFields.name = input.customerContact.trim();
    if (input.productNeed?.trim()) knownFields.productType = input.productNeed.trim();
    if (input.quantity?.trim()) knownFields.quantity = input.quantity.trim();
    if (input.budget?.trim()) knownFields.budget = input.budget.trim();
    if (input.deliveryDate?.trim()) knownFields.deliveryDate = input.deliveryDate.trim();
    if (input.internalRemark?.trim()) knownFields.internalRemark = input.internalRemark.trim();
    if (input.channelLabel?.trim()) knownFields.channelLabel = input.channelLabel.trim();

    const transcript = [
      input.summary ?? "",
      input.productNeed ?? "",
      input.budget ?? "",
      input.quantity ?? "",
      input.deliveryDate ?? "",
      input.internalRemark ?? "",
    ]
      .filter(Boolean)
      .join("\n");
    const analysis = analyzeSalesContent({ text: transcript, rules });
    for (const [key, value] of Object.entries(analysis.knownParameters)) {
      if (value?.trim() && !knownFields[key]) {
        knownFields[key] = value.trim();
      }
    }

    const missingFields = this.computeMissingFields(knownFields, rules, null);
    const completeness = this.computeCompleteness(knownFields, rules.requiredQuoteFields);
    const intentLevel =
      input.intentLevel ?? this.resolveManualIntentLevel(transcript, rules, analysis);
    const customerContact =
      input.phone?.trim() ||
      input.email?.trim() ||
      input.customerContact?.trim() ||
      null;

    const record: InquiryRecord = {
      id: `inq_${randomUUID()}`,
      workspaceId,
      conversationId: `manual_${randomUUID()}`,
      leadId: null,
      botId: "",
      sourceCode: input.sourceCode ?? null,
      sourceType: input.sourceType ?? "other",
      intentLevel,
      requirementCompleteness: completeness,
      needsEngineer: analysis.needsEngineer,
      summary: input.summary?.trim() || null,
      missingFields,
      riskNotes: analysis.riskNotes,
      knownFields,
      ownerId: input.ownerId?.trim() || null,
      nextActionAt: input.nextActionAt ?? null,
      quoteStatus: "none",
      status: "open",
      customerName: input.customerName.trim(),
      customerContact,
      createdAt: now,
      updatedAt: now,
    };
    await this.salesRepository.upsertInquiry(record);
    return this.getInquiry(workspaceId, record.id);
  }

  private resolveManualIntentLevel(
    text: string,
    rules: BusinessRulesPayload,
    analysis: ReturnType<typeof analyzeSalesContent>,
  ): IntentLevel {
    const lower = text.toLowerCase();
    if (rules.highIntentKeywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return "high";
    }
    if (/高优先级|紧急|尽快|报价|采购|合同/u.test(text)) {
      return "high";
    }
    if (analysis.needsEngineer) {
      return "high";
    }
    if (/低优先级|不急|低意向/u.test(text)) {
      return "low";
    }
    return "medium";
  }

  async findDuplicateInquiryByPhone(workspaceId: string, phone: string) {
    const normalized = phone.replace(/\s+/g, "");
    if (!normalized) {
      return null;
    }
    await this.syncWorkspaceInquiries(workspaceId);
    const items = await this.salesRepository.listInquiries(workspaceId);
    const match = items.find((item) => {
      const contact = (item.customerContact ?? item.knownFields.phone ?? "").replace(/\s+/g, "");
      return (
        contact &&
        (contact === normalized || contact.includes(normalized) || normalized.includes(contact))
      );
    });
    if (!match) {
      return null;
    }
    return {
      inquiryId: match.id,
      customerName: match.customerName ?? "访客",
      customerContact: match.customerContact,
      createdAt: match.createdAt,
    };
  }

  async listInquiries(
    workspaceId: string,
    query: {
      intent?: IntentLevel;
      status?: "open" | "closed" | "all";
      limit?: number;
      unassigned?: boolean;
      q?: string;
      tab?: import("./sales.types").InquiryListTab;
    } = {},
    scope?: { role: import("../auth/auth.types").WorkspaceMemberRole; userId: string },
  ) {
    await this.syncWorkspaceInquiries(workspaceId);
    const ownerId = resolveOwnerScope(scope);
    let items = await this.salesRepository.listInquiries(workspaceId, ownerId);
    if (query.intent) {
      items = items.filter((item) => item.intentLevel === query.intent);
    }
    if (query.status && query.status !== "all") {
      items = items.filter((item) => item.status === query.status);
    }
    if (query.unassigned) {
      items = items.filter((item) => !item.ownerId);
    }
    if (query.tab === "unassigned") items = items.filter((item) => !item.ownerId && item.status === "open");
    if (query.tab === "mine" && scope) items = items.filter((item) => item.ownerId === scope.userId);
    if (query.tab === "high_intent") items = items.filter((item) => item.intentLevel === "high" && item.status === "open");
    if (query.tab === "pending_quote") items = items.filter((item) => item.status === "open" && ["none", "collecting", "engineering_review", "to_quote"].includes(item.quoteStatus));
    if (query.tab === "overdue") {
      const now = Date.now();
      items = items.filter((item) => item.status === "open" && item.nextActionAt !== null && Date.parse(item.nextActionAt) < now);
    }
    if (query.q?.trim()) {
      const needle = query.q.trim().toLowerCase();
      items = items.filter(
        (item) =>
          (item.customerName ?? "").toLowerCase().includes(needle) ||
          item.id.toLowerCase().includes(needle) ||
          (item.summary?.toLowerCase().includes(needle) ?? false) ||
          (item.customerContact?.toLowerCase().includes(needle) ?? false),
      );
    }
    items.sort((left, right) => {
      const intentWeight = { high: 3, medium: 2, low: 1 };
      const delta = intentWeight[right.intentLevel] - intentWeight[left.intentLevel];
      if (delta !== 0) {
        return delta;
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
    if (query.limit && query.limit > 0) {
      items = items.slice(0, query.limit);
    }
    const bots = await this.ragRepository.listBotsByWorkspace(workspaceId);
    const botMap = new Map(bots.map((bot) => [bot.id, bot.name]));
    return items.map((item) => this.mapInquiryListItem(item, botMap.get(item.botId) ?? item.botId));
  }

  async getInquiryAssignStats(workspaceId: string): Promise<InquiryAssignStats> {
    await this.syncWorkspaceInquiries(workspaceId);
    const items = await this.salesRepository.listInquiries(workspaceId);
    const open = items.filter((item) => item.status === "open");
    const unassigned = open.filter((item) => !item.ownerId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayNewCount = open.filter((item) => Date.parse(item.createdAt) >= startOfToday.getTime()).length;
    const highPriorityUnassignedCount = unassigned.filter((item) => item.intentLevel === "high").length;
    const assignedOpenCount = open.filter((item) => item.ownerId).length;
    const monthAssignedCount = open.filter(
      (item) => item.ownerId && Date.parse(item.updatedAt) >= startOfMonth.getTime(),
    ).length;

    const assignHours = open
      .filter((item) => item.ownerId)
      .map((item) => (Date.parse(item.updatedAt) - Date.parse(item.createdAt)) / 3_600_000)
      .filter((hours) => Number.isFinite(hours) && hours >= 0 && hours <= 24 * 30);
    const avgAssignHours =
      assignHours.length > 0
        ? Math.round((assignHours.reduce((sum, hours) => sum + hours, 0) / assignHours.length) * 10) / 10
        : null;

    return {
      unassignedCount: unassigned.length,
      todayNewCount,
      highPriorityUnassignedCount,
      avgAssignHours,
      assignedOpenCount,
      monthAssignedCount,
    };
  }

  async getInquiryAssignCandidates(
    workspaceId: string,
    inquiryId: string,
    members: WorkspaceMemberSummary[],
  ): Promise<InquiryAssignCandidate[]> {
    const inquiry = await this.requireInquiry(workspaceId, inquiryId);
    await this.syncWorkspaceInquiries(workspaceId);
    const ownedInquiries = await this.salesRepository.listInquiries(workspaceId);
    return buildInquiryAssignCandidates(inquiry, members, ownedInquiries);
  }

  private mapInquiryListItem(item: InquiryRecord, botName: string) {
    return {
      id: item.id,
      conversationId: item.conversationId,
      leadId: item.leadId,
      botId: item.botId,
      botName,
      customerName: item.customerName ?? "访客",
      customerContact: item.customerContact,
      sourceCode: item.sourceCode,
      sourceType: item.sourceType,
      intentLevel: item.intentLevel,
      requirementCompleteness: item.requirementCompleteness,
      summary: item.summary,
      missingFields: item.missingFields,
      needsEngineer: item.needsEngineer,
      ownerId: item.ownerId,
      nextActionAt: item.nextActionAt,
      quoteStatus: item.quoteStatus,
      status: item.status,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
    };
  }

  async getInquiry(workspaceId: string, inquiryId: string) {
    await this.syncWorkspaceInquiries(workspaceId);
    const inquiry = await this.requireInquiry(workspaceId, inquiryId);
    const messages = await this.chatRepository.listMessagesByConversation(inquiry.conversationId);
    const lead = inquiry.leadId
      ? await this.chatRepository.findLeadById(workspaceId, inquiry.leadId)
      : await this.chatRepository.findLeadByConversation(inquiry.conversationId);
    const meta = await this.chatRepository.getConversationMeta(inquiry.conversationId);
    const quotes = await this.salesRepository.listQuoteOpportunitiesByInquiry(inquiry.id);
    const bot = await this.ragRepository.findBotById(workspaceId, inquiry.botId);
    return {
      ...this.mapInquiryListItem(inquiry, bot?.name ?? inquiry.botId),
      riskNotes: inquiry.riskNotes,
      knownFields: inquiry.knownFields,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      attachments: lead?.attachments ?? [],
      aiInsight: meta
        ? {
            intent: meta.aiIntent ?? null,
            productLine: meta.aiProductLine ?? null,
            confidence: meta.aiConfidence ?? null,
            missingFields: meta.aiMissingFields ?? [],
            suggestedQuestions: meta.aiSuggestedQuestions ?? [],
          }
        : null,
      quoteOpportunities: quotes.map((quote) => this.mapQuoteListItem(quote, inquiry)),
    };
  }

  async updateInquiry(
    workspaceId: string,
    inquiryId: string,
    patch: {
      ownerId?: string | null;
      nextActionAt?: string | null;
      status?: "open" | "closed";
      sourceCode?: string | null;
    },
  ) {
    const inquiry = await this.requireInquiry(workspaceId, inquiryId);
    const updated = await this.salesRepository.updateInquiry(workspaceId, inquiry.id, patch);
    if (!updated) {
      throw new SalesAccessError("Inquiry not found.");
    }
    return this.getInquiry(workspaceId, inquiryId);
  }

  async assignInquiry(workspaceId: string, inquiryId: string, ownerId: string, remark?: string) {
    const inquiry = await this.requireInquiry(workspaceId, inquiryId);
    const knownFields = { ...inquiry.knownFields };
    if (remark?.trim()) {
      knownFields.assignRemark = remark.trim();
    }
    await this.salesRepository.updateInquiry(workspaceId, inquiryId, {
      ownerId,
      knownFields,
    });
    return this.getInquiry(workspaceId, inquiryId);
  }

  async requestMissingFields(workspaceId: string, inquiryId: string) {
    const inquiry = await this.requireInquiry(workspaceId, inquiryId);
    const rules = await this.getBusinessRules(workspaceId);
    const analysis = analyzeSalesContent({
      text: [
        inquiry.summary ?? "",
        ...inquiry.missingFields,
        JSON.stringify(inquiry.knownFields),
      ].join("\n"),
      rules,
    });
    return {
      inquiryId: inquiry.id,
      missingFields: inquiry.missingFields,
      suggestedMessage: analysis.suggestedReply,
    };
  }

  // ── Inquiry sub-operations ─────────────────────────────────

  async batchAssignInquiries(
    workspaceId: string,
    inquiryIds: string[],
    ownerId: string,
  ) {
    const results: Awaited<ReturnType<typeof this.getInquiry>>[] = [];
    for (const id of inquiryIds) {
      await this.requireInquiry(workspaceId, id);
      await this.salesRepository.updateInquiry(workspaceId, id, { ownerId });
      results.push(await this.getInquiry(workspaceId, id));
    }
    return results;
  }

  async setInquiryIntentLevel(
    workspaceId: string,
    inquiryId: string,
    intentLevel: IntentLevel,
  ) {
    await this.requireInquiry(workspaceId, inquiryId);
    await this.salesRepository.updateInquiry(workspaceId, inquiryId, {
      intentLevel,
    } as Partial<InquiryRecord>);
    return this.getInquiry(workspaceId, inquiryId);
  }

  async markInquiryInvalid(workspaceId: string, inquiryId: string) {
    await this.requireInquiry(workspaceId, inquiryId);
    await this.salesRepository.updateInquiry(workspaceId, inquiryId, {
      status: "closed",
      riskNotes: ["无效线索（手动标记）"],
    } as Partial<InquiryRecord>);
    return this.getInquiry(workspaceId, inquiryId);
  }

  async markInquiryLost(workspaceId: string, inquiryId: string) {
    await this.requireInquiry(workspaceId, inquiryId);
    await this.salesRepository.updateInquiry(workspaceId, inquiryId, {
      status: "closed",
      riskNotes: ["已丢单（手动标记）"],
    } as Partial<InquiryRecord>);
    return this.getInquiry(workspaceId, inquiryId);
  }

  async updateInquiryCustomerInfo(
    workspaceId: string,
    inquiryId: string,
    body: { customerName?: string; customerContact?: string | null },
  ) {
    await this.requireInquiry(workspaceId, inquiryId);
    const patch: Partial<InquiryRecord> = {};
    if (body.customerName !== undefined) {
      patch.customerName = body.customerName;
    }
    if (body.customerContact !== undefined) {
      patch.customerContact = body.customerContact;
    }
    await this.salesRepository.updateInquiry(workspaceId, inquiryId, patch);
    return this.getInquiry(workspaceId, inquiryId);
  }

  async convertInquiryToQuote(
    workspaceId: string,
    inquiryId: string,
    body: { title?: string; estimatedAmount?: number | null },
  ) {
    await this.requireInquiry(workspaceId, inquiryId);
    return this.createQuoteOpportunity(workspaceId, {
      inquiryId,
      title: body.title,
      estimatedAmount: body.estimatedAmount,
    });
  }

  // ── Quote sub-operations ───────────────────────────────────

  async listQuoteOpportunities(
    workspaceId: string,
    query: {
      status?: "draft" | "to_send" | "sent" | "to_confirm" | "won" | "void" | "expiring";
      q?: string;
    } = {},
    scope?: { role: import("../auth/auth.types").WorkspaceMemberRole; userId: string },
  ) {
    await this.syncWorkspaceInquiries(workspaceId);
    const ownerId = resolveOwnerScope(scope);
    let quotes = await this.salesRepository.listQuoteOpportunities(
      workspaceId,
      ownerId,
    );
    const inquiries = await this.salesRepository.listInquiries(workspaceId);
    const inquiryMap = new Map(inquiries.map((item) => [item.id, item]));

    if (query.status) {
      quotes = quotes.filter((quote) => {
        const item = this.mapQuoteListItem(quote, inquiryMap.get(quote.inquiryId) ?? null);
        return this.matchesQuoteDisplayStatus(item, query.status!);
      });
    }
    if (query.q?.trim()) {
      const needle = query.q.trim().toLowerCase();
      quotes = quotes.filter((quote) => {
        const inquiry = inquiryMap.get(quote.inquiryId) ?? null;
        const title =
          quote.title ??
          inquiry?.summary?.slice(0, 48) ??
          inquiry?.customerName ??
          "报价机会";
        return (
          quote.id.toLowerCase().includes(needle) ||
          quote.inquiryId.toLowerCase().includes(needle) ||
          title.toLowerCase().includes(needle) ||
          (inquiry?.customerName ?? "").toLowerCase().includes(needle)
        );
      });
    }

    quotes.sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );

    return quotes.map((quote) =>
      this.mapQuoteListItem(quote, inquiryMap.get(quote.inquiryId) ?? null),
    );
  }

  private matchesQuoteDisplayStatus(
    item: ReturnType<SalesService["mapQuoteListItem"]>,
    status: "draft" | "to_send" | "sent" | "to_confirm" | "won" | "void" | "expiring",
  ): boolean {
    if (status === "expiring") {
      if (!item.quoteDueAt) return false;
      const due = Date.parse(item.quoteDueAt);
      if (!Number.isFinite(due)) return false;
      const daysLeft = (due - Date.now()) / (24 * 60 * 60 * 1000);
      return daysLeft >= 0 && daysLeft <= 7 && ["quoted", "confirming"].includes(item.stage);
    }
    const stageGroups: Record<typeof status, import("./sales.types").QuoteStage[]> = {
      draft: ["collecting", "engineering_review"],
      to_send: ["to_quote"],
      sent: ["quoted"],
      to_confirm: ["confirming"],
      won: ["won"],
      void: ["lost"],
    };
    return stageGroups[status].includes(item.stage);
  }

  private mapQuoteListItem(
    quote: QuoteOpportunityRecord,
    inquiry: InquiryRecord | null,
  ) {
    return {
      id: quote.id,
      inquiryId: quote.inquiryId,
      templateId: quote.templateId,
      stage: quote.stage,
      stageLabel: QUOTE_STAGE_LABELS[quote.stage],
      title:
        quote.title ??
        inquiry?.summary?.slice(0, 48) ??
        inquiry?.customerName ??
        "报价机会",
      customerName: inquiry?.customerName ?? "访客",
      customerContact: inquiry?.customerContact ?? null,
      estimatedAmount: quote.estimatedAmount,
      quotedAmount: quote.quotedAmount,
      wonAmount: quote.wonAmount,
      lostReason: quote.lostReason,
      quoteDueAt: quote.quoteDueAt,
      ownerId: quote.ownerId,
      nextFollowUpAt: quote.nextFollowUpAt,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    };
  }

  private buildPublicQuoteToken(): { rawToken: string; tokenHash: string; tokenPrefix: string } {
    const rawToken = `qpk_${randomBytes(24).toString("base64url")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    return {
      rawToken,
      tokenHash,
      tokenPrefix: rawToken.slice(0, 12),
    };
  }

  async createQuoteOpportunity(
    workspaceId: string,
    input: {
      inquiryId: string;
      title?: string;
      estimatedAmount?: number | null;
      templateId?: string | null;
    },
  ) {
    const inquiry = await this.requireInquiry(workspaceId, input.inquiryId);
    let templateId: string | null = input.templateId ?? null;
    if (templateId) {
      const template = await this.salesRepository.findQuoteTemplateById(workspaceId, templateId);
      if (!template) {
        throw new SalesValidationError("Quote template not found.");
      }
    } else {
      const defaultTemplate = await this.resolveDefaultQuoteTemplate(workspaceId);
      templateId = defaultTemplate?.id ?? null;
    }
    const now = new Date().toISOString();
    const record: QuoteOpportunityRecord = {
      id: `qopp_${randomUUID()}`,
      workspaceId,
      inquiryId: inquiry.id,
      templateId,
      stage: inquiry.requirementCompleteness >= 80 ? "to_quote" : "collecting",
      estimatedAmount: input.estimatedAmount ?? null,
      quotedAmount: null,
      wonAmount: null,
      lostReason: null,
      quoteDueAt: null,
      ownerId: inquiry.ownerId,
      nextFollowUpAt: null,
      title: input.title ?? inquiry.summary?.slice(0, 48) ?? inquiry.customerName,
      createdAt: now,
      updatedAt: now,
    };
    await this.salesRepository.createQuoteOpportunity(record);
    await this.salesRepository.updateInquiry(workspaceId, inquiry.id, {
      quoteStatus: record.stage,
    });
    return this.getQuoteOpportunity(workspaceId, record.id);
  }

  async getQuoteOpportunity(workspaceId: string, quoteId: string) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    const inquiry = await this.salesRepository.findInquiryById(workspaceId, quote.inquiryId);
    const followUps = await this.salesRepository.listQuoteFollowUps(quote.id);
    return {
      ...this.mapQuoteListItem(quote, inquiry),
      followUps,
    };
  }

  async updateQuoteOpportunity(
    workspaceId: string,
    quoteId: string,
    patch: Partial<{
      stage: QuoteStage;
      estimatedAmount: number | null;
      quotedAmount: number | null;
      wonAmount: number | null;
      lostReason: QuoteOpportunityRecord["lostReason"];
      quoteDueAt: string | null;
      ownerId: string | null;
      nextFollowUpAt: string | null;
      title: string | null;
      templateId: string | null;
    }>,
  ) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    const updated = await this.salesRepository.updateQuoteOpportunity(
      workspaceId,
      quote.id,
      patch,
    );
    if (!updated) {
      throw new SalesAccessError("Quote opportunity not found.");
    }
    if (patch.stage) {
      await this.salesRepository.updateInquiry(workspaceId, quote.inquiryId, {
        quoteStatus: patch.stage,
      });
      await this.salesRepository.createQuoteFollowUp({
        id: `qf_${randomUUID()}`,
        quoteOpportunityId: quote.id,
        kind: "status",
        title: `阶段更新为：${QUOTE_STAGE_LABELS[patch.stage]}`,
        createdAt: new Date().toISOString(),
      });
    }
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  async addQuoteFollowUp(
    workspaceId: string,
    quoteId: string,
    input: { title: string; body?: string; actor?: string },
  ) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    const record: QuoteFollowUpRecord = {
      id: `qf_${randomUUID()}`,
      quoteOpportunityId: quote.id,
      kind: "note",
      title: input.title,
      body: input.body ?? null,
      actor: input.actor ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.salesRepository.createQuoteFollowUp(record);
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  async copyQuote(workspaceId: string, quoteId: string) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    return this.createQuoteOpportunity(workspaceId, {
      inquiryId: quote.inquiryId,
      title: `${quote.title ?? "报价"} (副本)`,
      estimatedAmount: quote.estimatedAmount,
    });
  }

  async sendQuote(workspaceId: string, quoteId: string, body: { quotedAmount?: number | null }) {
    await this.requireQuote(workspaceId, quoteId);
    const patch: Partial<QuoteOpportunityRecord> = { stage: "quoted" as QuoteStage };
    if (body.quotedAmount !== undefined) {
      patch.quotedAmount = body.quotedAmount;
    }
    await this.salesRepository.updateQuoteOpportunity(workspaceId, quoteId, patch);
    await this.salesRepository.createQuoteFollowUp({
      id: `qf_${randomUUID()}`,
      quoteOpportunityId: quoteId,
      kind: "status",
      title: `报价已发出${body.quotedAmount != null ? `，金额：${body.quotedAmount}` : ""}`,
      createdAt: new Date().toISOString(),
    });
    const quote = await this.requireQuote(workspaceId, quoteId);
    await this.salesRepository.updateInquiry(workspaceId, quote.inquiryId, {
      quoteStatus: "quoted" as QuoteStage,
    });
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  async dealQuote(workspaceId: string, quoteId: string, body: { wonAmount?: number | null }) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    const patch: Partial<QuoteOpportunityRecord> = {
      stage: "won" as QuoteStage,
      wonAmount: body.wonAmount ?? quote.quotedAmount ?? quote.estimatedAmount ?? 0,
    };
    await this.salesRepository.updateQuoteOpportunity(workspaceId, quoteId, patch);
    await this.salesRepository.createQuoteFollowUp({
      id: `qf_${randomUUID()}`,
      quoteOpportunityId: quoteId,
      kind: "status",
      title: `已成交成交金额：${patch.wonAmount}`,
      createdAt: new Date().toISOString(),
    });
    await this.salesRepository.updateInquiry(workspaceId, quote.inquiryId, { status: "closed" });
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  async markQuoteLost(workspaceId: string, quoteId: string, body: { lostReason?: LostReason }) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    await this.salesRepository.updateQuoteOpportunity(workspaceId, quoteId, {
      stage: "lost" as QuoteStage,
      lostReason: body.lostReason ?? null,
    });
    await this.salesRepository.createQuoteFollowUp({
      id: `qf_${randomUUID()}`,
      quoteOpportunityId: quoteId,
      kind: "status",
      title: body.lostReason ? `已丢单，原因：${body.lostReason}` : "已丢单",
      createdAt: new Date().toISOString(),
    });
    await this.salesRepository.updateInquiry(workspaceId, quote.inquiryId, { status: "closed" });
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  async voidQuote(workspaceId: string, quoteId: string) {
    await this.requireQuote(workspaceId, quoteId);
    await this.salesRepository.updateQuoteOpportunity(workspaceId, quoteId, {
      stage: "lost" as QuoteStage,
      lostReason: null,
    });
    await this.salesRepository.createQuoteFollowUp({
      id: `qf_${randomUUID()}`,
      quoteOpportunityId: quoteId,
      kind: "status",
      title: "报价已作废",
      createdAt: new Date().toISOString(),
    });
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  async updateQuoteValidUntil(workspaceId: string, quoteId: string, body: { quoteDueAt: string }) {
    await this.requireQuote(workspaceId, quoteId);
    await this.salesRepository.updateQuoteOpportunity(workspaceId, quoteId, {
      quoteDueAt: body.quoteDueAt,
    });
    return this.getQuoteOpportunity(workspaceId, quoteId);
  }

  private async resolveDefaultQuoteTemplate(workspaceId: string): Promise<QuoteTemplateRecord | null> {
    const existing = await this.salesRepository.findDefaultQuoteTemplate(workspaceId);
    if (existing) {
      return existing;
    }
    const templates = await this.salesRepository.listQuoteTemplates(workspaceId);
    return templates[0] ?? null;
  }

  private async ensureQuoteTemplates(workspaceId: string): Promise<QuoteTemplateRecord[]> {
    const templates = await this.salesRepository.listQuoteTemplates(workspaceId);
    if (templates.length > 0) {
      return templates;
    }
    const record = buildDefaultQuoteTemplateRecord(workspaceId);
    const seeded: QuoteTemplateRecord = { ...record, isDefault: true };
    await this.salesRepository.createQuoteTemplate(seeded);
    return [seeded];
  }

  private async resolveTemplateForQuote(
    workspaceId: string,
    quote: QuoteOpportunityRecord,
  ): Promise<QuoteTemplateRecord> {
    if (quote.templateId) {
      const selected = await this.salesRepository.findQuoteTemplateById(
        workspaceId,
        quote.templateId,
      );
      if (selected) {
        return selected;
      }
    }
    const fallback = await this.resolveDefaultQuoteTemplate(workspaceId);
    if (fallback) {
      return fallback;
    }
    const [seeded] = await this.ensureQuoteTemplates(workspaceId);
    return seeded!;
  }

  async buildQuoteDocument(
    workspaceId: string,
    quoteId: string,
  ): Promise<QuoteDocumentPayload> {
    const quote = await this.requireQuote(workspaceId, quoteId);
    const inquiry = await this.salesRepository.findInquiryById(workspaceId, quote.inquiryId);
    const template = await this.resolveTemplateForQuote(workspaceId, quote);
    const sample = buildQuotePreviewSampleFromOpportunity(quote, inquiry, template);
    const html = renderQuoteTemplateHtml(template, sample);
    return { template: mapQuoteTemplateResponse(template), sample, html };
  }

  async listQuoteTemplates(workspaceId: string) {
    const templates = await this.ensureQuoteTemplates(workspaceId);
    return templates.map(mapQuoteTemplateResponse);
  }

  async getQuoteTemplate(workspaceId: string, templateId: string) {
    const record = await this.salesRepository.findQuoteTemplateById(workspaceId, templateId);
    if (!record) {
      throw new SalesAccessError("Quote template not found.");
    }
    return mapQuoteTemplateResponse(record);
  }

  async createQuoteTemplate(
    workspaceId: string,
    input: {
      templateName: string;
      companyName?: string;
      description?: string;
      themeColor?: string;
      logoPosition?: QuoteTemplateRecord["logoPosition"];
      showCompanyInfo?: boolean;
      showCustomerInfo?: boolean;
      fields?: string[];
      terms?: Partial<QuoteTemplateTerms>;
      isDefault?: boolean;
    },
  ) {
    const name = input.templateName.trim();
    if (!name) {
      throw new SalesValidationError("templateName is required.");
    }
    const existing = await this.salesRepository.listQuoteTemplates(workspaceId);
    const shouldDefault = input.isDefault === true || existing.length === 0;
    if (shouldDefault) {
      await this.salesRepository.clearDefaultQuoteTemplate(workspaceId);
    }
    const base = buildDefaultQuoteTemplateRecord(workspaceId, {
      templateName: name,
      companyName: input.companyName,
      description: input.description,
    });
    const now = new Date().toISOString();
    const record: QuoteTemplateRecord = {
      ...base,
      themeColor: input.themeColor?.trim() || base.themeColor,
      logoPosition: input.logoPosition ?? base.logoPosition,
      showCompanyInfo: input.showCompanyInfo ?? base.showCompanyInfo,
      showCustomerInfo: input.showCustomerInfo ?? base.showCustomerInfo,
      fields: input.fields?.length ? input.fields : base.fields,
      terms: { ...base.terms, ...input.terms },
      isDefault: shouldDefault,
      createdAt: now,
      updatedAt: now,
    };
    await this.salesRepository.createQuoteTemplate(record);
    return mapQuoteTemplateResponse(record);
  }

  async updateQuoteTemplate(
    workspaceId: string,
    templateId: string,
    patch: Partial<{
      templateName: string;
      companyName: string;
      description: string;
      themeColor: string;
      logoPosition: QuoteTemplateRecord["logoPosition"];
      showCompanyInfo: boolean;
      showCustomerInfo: boolean;
      fields: string[];
      terms: Partial<QuoteTemplateTerms>;
      isDefault: boolean;
    }>,
  ) {
    const current = await this.salesRepository.findQuoteTemplateById(workspaceId, templateId);
    if (!current) {
      throw new SalesAccessError("Quote template not found.");
    }
    if (patch.isDefault === true) {
      await this.salesRepository.clearDefaultQuoteTemplate(workspaceId, templateId);
    }
    const nextTerms = patch.terms ? { ...current.terms, ...patch.terms } : current.terms;
    const updated = await this.salesRepository.updateQuoteTemplate(workspaceId, templateId, {
      templateName: patch.templateName?.trim() || current.templateName,
      companyName: patch.companyName?.trim() ?? current.companyName,
      description: patch.description?.trim() ?? current.description,
      themeColor: patch.themeColor?.trim() || current.themeColor,
      logoPosition: patch.logoPosition ?? current.logoPosition,
      showCompanyInfo: patch.showCompanyInfo ?? current.showCompanyInfo,
      showCustomerInfo: patch.showCustomerInfo ?? current.showCustomerInfo,
      fields: patch.fields?.length ? patch.fields : current.fields,
      terms: nextTerms,
      isDefault: patch.isDefault ?? current.isDefault,
    });
    if (!updated) {
      throw new SalesAccessError("Quote template not found.");
    }
    return mapQuoteTemplateResponse(updated);
  }

  async deleteQuoteTemplate(workspaceId: string, templateId: string) {
    const current = await this.salesRepository.findQuoteTemplateById(workspaceId, templateId);
    if (!current) {
      throw new SalesAccessError("Quote template not found.");
    }
    const deleted = await this.salesRepository.deleteQuoteTemplate(workspaceId, templateId);
    if (!deleted) {
      throw new SalesAccessError("Quote template not found.");
    }
    if (current.isDefault) {
      const remaining = await this.salesRepository.listQuoteTemplates(workspaceId);
      if (remaining[0]) {
        await this.salesRepository.updateQuoteTemplate(workspaceId, remaining[0].id, {
          isDefault: true,
        });
      }
    }
    return { ok: true };
  }

  async setDefaultQuoteTemplate(workspaceId: string, templateId: string) {
    const current = await this.salesRepository.findQuoteTemplateById(workspaceId, templateId);
    if (!current) {
      throw new SalesAccessError("Quote template not found.");
    }
    await this.salesRepository.clearDefaultQuoteTemplate(workspaceId, templateId);
    const updated = await this.salesRepository.updateQuoteTemplate(workspaceId, templateId, {
      isDefault: true,
    });
    if (!updated) {
      throw new SalesAccessError("Quote template not found.");
    }
    return mapQuoteTemplateResponse(updated);
  }

  async previewQuoteTemplate(workspaceId: string, templateId: string) {
    const record = await this.salesRepository.findQuoteTemplateById(workspaceId, templateId);
    if (!record) {
      throw new SalesAccessError("Quote template not found.");
    }
    const sample = buildQuotePreviewSampleFromOpportunity(
      {
        id: "qopp_preview",
        workspaceId,
        inquiryId: "inq_preview",
        templateId: record.id,
        stage: "quoted",
        estimatedAmount: 137760,
        quotedAmount: 137760,
        wonAmount: null,
        lostReason: null,
        quoteDueAt: null,
        ownerId: null,
        nextFollowUpAt: null,
        title: "演示报价项目",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      null,
      record,
    );
    const html = renderQuoteTemplateHtml(record, sample);
    return {
      template: mapQuoteTemplateResponse(record),
      sample,
      html,
    };
  }

  async createQuotePublicLink(
    workspaceId: string,
    quoteId: string,
    createdBy: string | null,
  ) {
    const quote = await this.requireQuote(workspaceId, quoteId);
    const now = new Date().toISOString();
    const token = this.buildPublicQuoteToken();
    const record = await this.salesRepository.upsertQuotePublicLink({
      id: `qpl_${randomUUID()}`,
      workspaceId,
      quoteOpportunityId: quote.id,
      tokenHash: token.tokenHash,
      tokenPrefix: token.tokenPrefix,
      status: "active",
      createdBy,
      createdAt: now,
      lastAccessedAt: null,
      confirmedAt: null,
    });
    return {
      quoteId: quote.id,
      token: token.rawToken,
      tokenPrefix: record.tokenPrefix,
      url: `/public/quotes/${encodeURIComponent(token.rawToken)}`,
      createdAt: record.createdAt,
    };
  }

  async getPublicQuoteByToken(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const link = await this.salesRepository.findQuotePublicLinkByTokenHash(tokenHash);
    if (!link || link.status !== "active") {
      throw new SalesAccessError("Public quote not found.");
    }
    await this.salesRepository.touchQuotePublicLinkAccess(link.id, {
      lastAccessedAt: new Date().toISOString(),
      confirmedAt: link.confirmedAt,
      status: link.status,
    });
    const quote = await this.requireQuote(link.workspaceId, link.quoteOpportunityId);
    const inquiry = await this.salesRepository.findInquiryById(link.workspaceId, quote.inquiryId);
    const followUps = await this.salesRepository.listQuoteFollowUps(quote.id);
    const document = await this.buildQuoteDocument(link.workspaceId, quote.id);
    return {
      ...this.mapQuoteListItem(quote, inquiry),
      followUps,
      publicTokenPrefix: link.tokenPrefix,
      publicConfirmedAt: link.confirmedAt,
      document,
    };
  }

  async confirmPublicQuoteByToken(token: string, body: { action?: string }) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const link = await this.salesRepository.findQuotePublicLinkByTokenHash(tokenHash);
    if (!link || link.status !== "active") {
      throw new SalesAccessError("Public quote not found.");
    }
    const confirmedAt = new Date().toISOString();
    await this.salesRepository.touchQuotePublicLinkAccess(link.id, {
      lastAccessedAt: confirmedAt,
      confirmedAt,
      status: link.status,
    });
    await this.salesRepository.createQuoteFollowUp({
      id: `qf_${randomUUID()}`,
      quoteOpportunityId: link.quoteOpportunityId,
      kind: "system",
      title: "客户已打开公开报价页并执行确认动作",
      body: `action=${body.action?.trim() || "confirmed"}`,
      actor: "public_quote",
      createdAt: confirmedAt,
    });
    return {
      ok: true,
      action: body.action?.trim() || "confirmed",
      confirmedAt,
    };
  }

  async getSalesOverview(workspaceId: string, query: AnalyticsQuery): Promise<SalesOverviewMetrics> {
    await this.syncWorkspaceInquiries(workspaceId);
    const inquiries = (await this.salesRepository.listInquiries(workspaceId)).filter((item) =>
      isWithinAnalyticsRange(item.createdAt, query),
    );
    const quotes = (await this.salesRepository.listQuoteOpportunities(workspaceId)).filter((item) =>
      isWithinAnalyticsRange(item.createdAt, query),
    );
    const effectiveInquiries = inquiries.filter(
      (item) => item.intentLevel !== "low" || item.leadId,
    ).length;
    return {
      effectiveInquiries,
      highIntentCount: inquiries.filter((item) => item.intentLevel === "high").length,
      pendingQuoteCount: quotes.filter((item) =>
        ["collecting", "engineering_review", "to_quote"].includes(item.stage),
      ).length,
      quotedCount: quotes.filter((item) =>
        ["quoted", "confirming"].includes(item.stage),
      ).length,
      wonCount: quotes.filter((item) => item.stage === "won").length,
      estimatedAmountTotal: this.sumAmounts(quotes.map((item) => item.estimatedAmount)),
      wonAmountTotal: this.sumAmounts(quotes.map((item) => item.wonAmount)),
    };
  }

  async getConversionFunnel(
    workspaceId: string,
    query: AnalyticsQuery,
  ): Promise<ConversionFunnelStep[]> {
    await this.syncWorkspaceInquiries(workspaceId);
    const inquiries = (await this.salesRepository.listInquiries(workspaceId)).filter((item) =>
      isWithinAnalyticsRange(item.createdAt, query),
    );
    const quotes = (await this.salesRepository.listQuoteOpportunities(workspaceId)).filter((item) =>
      isWithinAnalyticsRange(item.createdAt, query),
    );
    const conversations = (await this.chatRepository.listConversationsByWorkspace(workspaceId)).filter(
      (item) => isWithinAnalyticsRange(item.createdAt, query),
    );
    return [
      { key: "conversations", label: "对话", count: conversations.length },
      {
        key: "effective_inquiries",
        label: "有效询盘",
        count: inquiries.filter((item) => item.intentLevel !== "low" || item.leadId).length,
      },
      {
        key: "requirement_complete",
        label: "完成需求采集",
        count: inquiries.filter((item) => item.requirementCompleteness >= 70).length,
      },
      {
        key: "quoted",
        label: "进入报价",
        count: quotes.filter((item) =>
          ["to_quote", "quoted", "confirming", "won"].includes(item.stage),
        ).length,
      },
      { key: "won", label: "已成交", count: quotes.filter((item) => item.stage === "won").length },
    ];
  }

  async getChannelAttribution(
    workspaceId: string,
    query: AnalyticsQuery,
  ): Promise<ChannelAttributionItem[]> {
    await this.syncWorkspaceInquiries(workspaceId);
    const inquiries = (await this.salesRepository.listInquiries(workspaceId)).filter((item) =>
      isWithinAnalyticsRange(item.createdAt, query),
    );
    const quotes = (await this.salesRepository.listQuoteOpportunities(workspaceId)).filter((item) =>
      isWithinAnalyticsRange(item.createdAt, query),
    );
    const sources = await this.salesRepository.listSourceCodes(workspaceId);
    const sourceLabel = new Map(sources.map((item) => [item.code, item.label]));
    const buckets = new Map<string, ChannelAttributionItem>();

    for (const inquiry of inquiries) {
      const key = inquiry.sourceCode ?? inquiry.sourceType;
      const current = buckets.get(key) ?? {
        sourceCode: inquiry.sourceCode,
        sourceLabel: inquiry.sourceCode
          ? (sourceLabel.get(inquiry.sourceCode) ?? inquiry.sourceCode)
          : inquiry.sourceType,
        sourceType: inquiry.sourceType,
        inquiryCount: 0,
        quoteCount: 0,
        wonCount: 0,
        wonAmountTotal: null,
      };
      current.inquiryCount += 1;
      buckets.set(key, current);
    }

    for (const quote of quotes) {
      const inquiry = inquiries.find((item) => item.id === quote.inquiryId);
      if (!inquiry) {
        continue;
      }
      const key = inquiry.sourceCode ?? inquiry.sourceType;
      const current = buckets.get(key);
      if (!current) {
        continue;
      }
      current.quoteCount += 1;
      if (quote.stage === "won") {
        current.wonCount += 1;
        current.wonAmountTotal = (current.wonAmountTotal ?? 0) + (quote.wonAmount ?? 0);
      }
      buckets.set(key, current);
    }

    return [...buckets.values()].sort(
      (left, right) => (right.wonAmountTotal ?? 0) - (left.wonAmountTotal ?? 0),
    );
  }

  async getSourceAnalytics(
    workspaceId: string,
    query: AnalyticsQuery,
  ): Promise<SourceAnalyticsItem[]> {
    const attribution = await this.getChannelAttribution(workspaceId, query);
    return attribution.map((item) => ({
      ...item,
      visitCount: null,
      conversationCount: item.inquiryCount,
      requirementCompleteCount: 0,
      roi: null,
    }));
  }

  async listSources(workspaceId: string) {
    return this.salesRepository.listSourceCodes(workspaceId);
  }

  async createSource(
    workspaceId: string,
    input: { code: string; label: string; sourceType: SourceType },
  ) {
    const normalized = input.code.trim();
    if (!normalized) {
      throw new SalesValidationError("Source code is required.");
    }
    const existing = await this.salesRepository.findSourceCodeByCode(workspaceId, normalized);
    if (existing) {
      throw new SalesValidationError("Source code already exists.");
    }
    const now = new Date().toISOString();
    return this.salesRepository.createSourceCode({
      id: `src_${randomUUID()}`,
      workspaceId,
      code: normalized,
      label: input.label.trim() || normalized,
      sourceType: input.sourceType,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  async listCustomerOpportunities(workspaceId: string): Promise<CustomerOpportunityItem[]> {
    await this.syncWorkspaceInquiries(workspaceId);
    const inquiries = await this.salesRepository.listInquiries(workspaceId);
    const quotes = await this.salesRepository.listQuoteOpportunities(workspaceId);
    const quoteByInquiry = new Map(quotes.map((item) => [item.inquiryId, item]));
    return inquiries.map((inquiry) => {
      const quote = quoteByInquiry.get(inquiry.id) ?? null;
      return {
        id: inquiry.id,
        inquiryId: inquiry.id,
        quoteOpportunityId: quote?.id ?? null,
        customerName: inquiry.customerName ?? "访客",
        customerContact: inquiry.customerContact,
        stage: quote?.stage ?? "collecting",
        lifecycleColumn: this.resolveLifecycleColumn(inquiry, quote),
        ownerId: quote?.ownerId ?? inquiry.ownerId,
        nextFollowUpAt: quote?.nextFollowUpAt ?? inquiry.nextActionAt,
        updatedAt: quote?.updatedAt ?? inquiry.updatedAt,
      };
    });
  }

  private resolveLifecycleColumn(
    inquiry: InquiryRecord,
    quote: QuoteOpportunityRecord | null,
  ): CustomerOpportunityItem["lifecycleColumn"] {
    if (quote?.stage === "won") {
      return "won_or_repeat";
    }
    if (quote && ["quoted", "confirming", "to_quote", "engineering_review"].includes(quote.stage)) {
      return "quoting";
    }
    if (inquiry.requirementCompleteness < 70) {
      return inquiry.ownerId ? "collecting_requirements" : "awaiting_first_contact";
    }
    const staleMs = Date.now() - new Date(inquiry.updatedAt).getTime();
    if (staleMs > 7 * 24 * 60 * 60 * 1000) {
      return "silent_risk";
    }
    return "collecting_requirements";
  }

  async getCustomerRecommendations(
    workspaceId: string,
  ): Promise<CustomerOperationRecommendation[]> {
    await this.syncWorkspaceInquiries(workspaceId);
    const inquiries = await this.salesRepository.listInquiries(workspaceId);
    const quotes = await this.salesRepository.listQuoteOpportunities(workspaceId);
    const recommendations: CustomerOperationRecommendation[] = [];

    const highIntentWithoutOwner = inquiries.filter(
      (item) => item.intentLevel === "high" && !item.ownerId,
    );
    if (highIntentWithoutOwner.length > 0) {
      recommendations.push({
        id: "rec_high_intent_unassigned",
        title: `优先跟进 ${highIntentWithoutOwner.length} 个未分配的高意向询盘`,
        detail: "建议在 10 分钟内分配负责人并首次联系。",
        priority: "high",
      });
    }

    const overdueQuotes = quotes.filter((item) => {
      if (!item.nextFollowUpAt) {
        return false;
      }
      return Date.parse(item.nextFollowUpAt) < Date.now();
    });
    if (overdueQuotes.length > 0) {
      recommendations.push({
        id: "rec_overdue_follow_up",
        title: `${overdueQuotes.length} 个报价机会已超过计划跟进时间`,
        detail: "请更新下次跟进时间或记录当前进展。",
        priority: "medium",
      });
    }

    const incomplete = inquiries.filter((item) => item.requirementCompleteness < 60);
    if (incomplete.length > 0) {
      recommendations.push({
        id: "rec_missing_fields",
        title: `有 ${incomplete.length} 个询盘资料完整度不足 60%`,
        detail: "可通过销售助手生成补充参数话术并发送给客户。",
        priority: "medium",
      });
    }

    return recommendations;
  }

  analyzeAssistant(input: { text: string; workspaceId: string }) {
    return this.getBusinessRules(input.workspaceId).then((rules) =>
      analyzeSalesContent({ text: input.text, rules }),
    );
  }

  async createAssistantReplyDraft(workspaceId: string, text: string) {
    const rules = await this.getBusinessRules(workspaceId);
    return analyzeSalesContent({ text, rules });
  }

  async createRequirementSheet(workspaceId: string, text: string) {
    const rules = await this.getBusinessRules(workspaceId);
    const analysis = analyzeSalesContent({ text, rules });
    return {
      markdown: buildRequirementSheetMarkdown(analysis),
      sheet: analysis.requirementSheet,
    };
  }

  private sumAmounts(values: Array<number | null>): number | null {
    const amounts = values.filter((value): value is number => value !== null && value !== undefined);
    if (amounts.length === 0) {
      return null;
    }
    return amounts.reduce((sum, value) => sum + value, 0);
  }

  private async requireInquiry(workspaceId: string, inquiryId: string): Promise<InquiryRecord> {
    const inquiry = await this.salesRepository.findInquiryById(workspaceId, inquiryId);
    if (!inquiry || inquiry.workspaceId !== workspaceId) {
      throw new SalesAccessError("Inquiry not found.");
    }
    return inquiry;
  }

  private async requireQuote(
    workspaceId: string,
    quoteId: string,
  ): Promise<QuoteOpportunityRecord> {
    const quote = await this.salesRepository.findQuoteOpportunityById(workspaceId, quoteId);
    if (!quote || quote.workspaceId !== workspaceId) {
      throw new SalesAccessError("Quote opportunity not found.");
    }
    return quote;
  }
}
