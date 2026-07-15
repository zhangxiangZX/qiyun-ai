import type { RequestContext } from "../workspace";
import type { AnalyticsQuery } from "../analytics/analytics-query";
import {
  SalesAccessError,
  SalesService,
  SalesValidationError,
} from "./sales.service";
import type {
  CreateInquiryInput,
  InquiryAssignCandidate,
  InquiryAssignStats,
  InquiryListTab,
  IntentLevel,
  LostReason,
  QuoteStage,
  SourceType,
} from "./sales.types";
import type { WorkspaceMemberSummary } from "../auth/auth.types";
import type { AuditApi } from "../audit/audit.api";

export { SalesAccessError, SalesValidationError };

export class SalesApi {
  constructor(
    private readonly service: SalesService,
    private readonly auditApi?: AuditApi,
  ) {}

  private audit(
    context: RequestContext,
    module: string,
    action: string,
    targetId: string | null,
    detail?: Record<string, unknown> | null,
  ): void {
    if (!this.auditApi) return;
    void this.auditApi.write({
      workspaceId: context.workspaceId,
      userId: context.userId,
      module,
      action,
      targetId,
      detail,
    });
  }

  getSalesOverview(context: RequestContext, query: AnalyticsQuery) {
    return this.service.getSalesOverview(context.workspaceId, query);
  }

  getConversionFunnel(context: RequestContext, query: AnalyticsQuery) {
    return this.service.getConversionFunnel(context.workspaceId, query);
  }

  getChannelAttribution(context: RequestContext, query: AnalyticsQuery) {
    return this.service.getChannelAttribution(context.workspaceId, query);
  }

  getSourceAnalytics(context: RequestContext, query: AnalyticsQuery) {
    return this.service.getSourceAnalytics(context.workspaceId, query);
  }

  listInquiries(
    context: RequestContext,
    query: {
      intent?: IntentLevel;
      status?: "open" | "closed" | "all";
      limit?: number;
      unassigned?: boolean;
      q?: string;
      tab?: InquiryListTab;
    },
  ) {
    return this.service.listInquiries(context.workspaceId, query, context);
  }

  async createInquiry(context: RequestContext, body: CreateInquiryInput) {
    const result = await this.service.createInquiry(context.workspaceId, body);
    this.audit(context, "inquiry", "create", result.id, {
      customerName: result.customerName,
      sourceType: result.sourceType,
      intentLevel: result.intentLevel,
    });
    return result;
  }

  getInquiryAssignStats(context: RequestContext): Promise<InquiryAssignStats> {
    return this.service.getInquiryAssignStats(context.workspaceId);
  }

  getInquiryAssignCandidates(
    context: RequestContext,
    inquiryId: string,
    members: WorkspaceMemberSummary[],
  ): Promise<InquiryAssignCandidate[]> {
    return this.service.getInquiryAssignCandidates(context.workspaceId, inquiryId, members);
  }

  getInquiry(context: RequestContext, inquiryId: string) {
    return this.service.getInquiry(context.workspaceId, inquiryId);
  }

  async updateInquiry(
    context: RequestContext,
    inquiryId: string,
    body: {
      ownerId?: string | null;
      nextActionAt?: string | null;
      status?: "open" | "closed";
      sourceCode?: string | null;
    },
  ) {
    const result = await this.service.updateInquiry(
      context.workspaceId,
      inquiryId,
      body,
    );
    this.audit(context, "inquiry", "update", inquiryId, body);
    return result;
  }

  async assignInquiry(
    context: RequestContext,
    inquiryId: string,
    body: { ownerId: string; remark?: string },
  ) {
    const result = await this.service.assignInquiry(
      context.workspaceId,
      inquiryId,
      body.ownerId,
      body.remark,
    );
    this.audit(context, "inquiry", "assign", inquiryId, {
      ownerId: body.ownerId,
      remark: body.remark ?? null,
    });
    return result;
  }

  requestMissingFields(context: RequestContext, inquiryId: string) {
    return this.service.requestMissingFields(context.workspaceId, inquiryId);
  }

  // ── Inquiry sub-operations ─────────────────────────────────

  async batchAssignInquiries(
    context: RequestContext,
    body: { inquiryIds: string[]; ownerId: string },
  ) {
    const results = await this.service.batchAssignInquiries(
      context.workspaceId,
      body.inquiryIds,
      body.ownerId,
    );
    this.audit(context, "inquiry", "batch_assign", null, {
      inquiryIds: body.inquiryIds,
      ownerId: body.ownerId,
    });
    return results;
  }

  async setInquiryIntentLevel(
    context: RequestContext,
    inquiryId: string,
    body: { intentLevel: IntentLevel },
  ) {
    const result = await this.service.setInquiryIntentLevel(
      context.workspaceId,
      inquiryId,
      body.intentLevel,
    );
    this.audit(context, "inquiry", "intent_level", inquiryId, body);
    return result;
  }

  async markInquiryInvalid(context: RequestContext, inquiryId: string) {
    const result = await this.service.markInquiryInvalid(context.workspaceId, inquiryId);
    this.audit(context, "inquiry", "invalid", inquiryId, null);
    return result;
  }

  async markInquiryLost(context: RequestContext, inquiryId: string) {
    const result = await this.service.markInquiryLost(context.workspaceId, inquiryId);
    this.audit(context, "inquiry", "lost", inquiryId, null);
    return result;
  }

  async updateInquiryCustomerInfo(
    context: RequestContext,
    inquiryId: string,
    body: { customerName?: string; customerContact?: string | null },
  ) {
    const result = await this.service.updateInquiryCustomerInfo(
      context.workspaceId,
      inquiryId,
      body,
    );
    this.audit(context, "inquiry", "customer_info", inquiryId, body);
    return result;
  }

  async convertInquiryToQuote(
    context: RequestContext,
    inquiryId: string,
    body: { title?: string; estimatedAmount?: number | null },
  ) {
    const result = await this.service.convertInquiryToQuote(
      context.workspaceId,
      inquiryId,
      body,
    );
    this.audit(context, "inquiry", "convert_to_quote", inquiryId, { quoteId: result.id });
    return result;
  }

  // ── Quote sub-operations ───────────────────────────────────

  async copyQuote(context: RequestContext, quoteId: string) {
    const result = await this.service.copyQuote(context.workspaceId, quoteId);
    this.audit(context, "quote", "copy", quoteId, { newQuoteId: result.id });
    return result;
  }

  async sendQuote(
    context: RequestContext,
    quoteId: string,
    body: { quotedAmount?: number | null },
  ) {
    const result = await this.service.sendQuote(context.workspaceId, quoteId, body);
    this.audit(context, "quote", "send", quoteId, body);
    return result;
  }

  async dealQuote(
    context: RequestContext,
    quoteId: string,
    body: { wonAmount?: number | null },
  ) {
    const result = await this.service.dealQuote(context.workspaceId, quoteId, body);
    this.audit(context, "quote", "deal", quoteId, body);
    return result;
  }

  async markQuoteLost(
    context: RequestContext,
    quoteId: string,
    body: { lostReason?: LostReason },
  ) {
    const result = await this.service.markQuoteLost(context.workspaceId, quoteId, body);
    this.audit(context, "quote", "lost", quoteId, body);
    return result;
  }

  async voidQuote(context: RequestContext, quoteId: string) {
    const result = await this.service.voidQuote(context.workspaceId, quoteId);
    this.audit(context, "quote", "void", quoteId, null);
    return result;
  }

  async updateQuoteValidUntil(
    context: RequestContext,
    quoteId: string,
    body: { quoteDueAt: string },
  ) {
    const result = await this.service.updateQuoteValidUntil(
      context.workspaceId,
      quoteId,
      body,
    );
    this.audit(context, "quote", "valid_until", quoteId, body);
    return result;
  }

  async createQuotePublicLink(
    context: RequestContext,
    quoteId: string,
  ) {
    const result = await this.service.createQuotePublicLink(
      context.workspaceId,
      quoteId,
      context.userId,
    );
    this.audit(context, "quote", "public_link_rotate", quoteId, {
      tokenPrefix: result.tokenPrefix,
    });
    return result;
  }

  listQuoteOpportunities(
    context: RequestContext,
    query: {
      status?: "draft" | "to_send" | "sent" | "to_confirm" | "won" | "void" | "expiring";
      q?: string;
    } = {},
  ) {
    return this.service.listQuoteOpportunities(context.workspaceId, query, context);
  }

  async createQuoteOpportunity(
    context: RequestContext,
    body: {
      inquiryId: string;
      title?: string;
      estimatedAmount?: number | null;
      templateId?: string | null;
    },
  ) {
    const result = await this.service.createQuoteOpportunity(context.workspaceId, body);
    this.audit(context, "quote", "create", result.id, { inquiryId: body.inquiryId });
    return result;
  }

  getQuoteOpportunity(context: RequestContext, quoteId: string) {
    return this.service.getQuoteOpportunity(context.workspaceId, quoteId);
  }

  async updateQuoteOpportunity(
    context: RequestContext,
    quoteId: string,
    body: Partial<{
      stage: QuoteStage;
      estimatedAmount: number | null;
      quotedAmount: number | null;
      wonAmount: number | null;
      lostReason: LostReason;
      quoteDueAt: string | null;
      ownerId: string | null;
      nextFollowUpAt: string | null;
      title: string | null;
      templateId: string | null;
    }>,
  ) {
    const result = await this.service.updateQuoteOpportunity(
      context.workspaceId,
      quoteId,
      body,
    );
    this.audit(
      context,
      "quote",
      body.stage ? "status_change" : "update",
      quoteId,
      body,
    );
    return result;
  }

  async addQuoteFollowUp(
    context: RequestContext,
    quoteId: string,
    body: { title: string; body?: string; actor?: string },
  ) {
    const result = await this.service.addQuoteFollowUp(
      context.workspaceId,
      quoteId,
      body,
    );
    this.audit(context, "quote", "follow_up", quoteId, { title: body.title });
    return result;
  }

  analyzeAssistant(context: RequestContext, body: { text: string }) {
    return this.service.analyzeAssistant({ workspaceId: context.workspaceId, text: body.text });
  }

  createAssistantReplyDraft(context: RequestContext, body: { text: string }) {
    return this.service.createAssistantReplyDraft(context.workspaceId, body.text);
  }

  createRequirementSheet(context: RequestContext, body: { text: string }) {
    return this.service.createRequirementSheet(context.workspaceId, body.text);
  }

  listSources(context: RequestContext) {
    return this.service.listSources(context.workspaceId);
  }

  async createSource(
    context: RequestContext,
    body: { code: string; label: string; sourceType: SourceType },
  ) {
    const result = await this.service.createSource(context.workspaceId, body);
    this.audit(context, "channel", "create", result.id, body);
    return result;
  }

  listCustomerOpportunities(context: RequestContext) {
    return this.service.listCustomerOpportunities(context.workspaceId);
  }

  getCustomerRecommendations(context: RequestContext) {
    return this.service.getCustomerRecommendations(context.workspaceId);
  }

  getBusinessRules(context: RequestContext) {
    return this.service.getBusinessRules(context.workspaceId);
  }

  async updateBusinessRules(
    context: RequestContext,
    body: Partial<{
      highIntentKeywords: string[];
      requiredQuoteFields: string[];
      leadFields: string[];
      highIntentReminderMinutes: number;
      transferToHumanKeywords: string[];
    }>,
  ) {
    const result = await this.service.updateBusinessRules(context.workspaceId, body);
    this.audit(context, "settings", "update", context.workspaceId, body);
    return result;
  }

  listQuoteTemplates(context: RequestContext) {
    return this.service.listQuoteTemplates(context.workspaceId);
  }

  getQuoteTemplate(context: RequestContext, templateId: string) {
    return this.service.getQuoteTemplate(context.workspaceId, templateId);
  }

  async createQuoteTemplate(
    context: RequestContext,
    body: {
      templateName: string;
      companyName?: string;
      description?: string;
      themeColor?: string;
      logoPosition?: "left" | "center" | "right";
      showCompanyInfo?: boolean;
      showCustomerInfo?: boolean;
      fields?: string[];
      terms?: { payment?: string; delivery?: string; validity?: string };
      isDefault?: boolean;
    },
  ) {
    const result = await this.service.createQuoteTemplate(context.workspaceId, body);
    this.audit(context, "quote_template", "create", result.id, { templateName: result.templateName });
    return result;
  }

  async updateQuoteTemplate(
    context: RequestContext,
    templateId: string,
    body: Partial<{
      templateName: string;
      companyName: string;
      description: string;
      themeColor: string;
      logoPosition: "left" | "center" | "right";
      showCompanyInfo: boolean;
      showCustomerInfo: boolean;
      fields: string[];
      terms: { payment?: string; delivery?: string; validity?: string };
      isDefault: boolean;
    }>,
  ) {
    const result = await this.service.updateQuoteTemplate(context.workspaceId, templateId, body);
    this.audit(context, "quote_template", "update", templateId, body);
    return result;
  }

  async deleteQuoteTemplate(context: RequestContext, templateId: string) {
    const result = await this.service.deleteQuoteTemplate(context.workspaceId, templateId);
    this.audit(context, "quote_template", "delete", templateId);
    return result;
  }

  async setDefaultQuoteTemplate(context: RequestContext, templateId: string) {
    const result = await this.service.setDefaultQuoteTemplate(context.workspaceId, templateId);
    this.audit(context, "quote_template", "set_default", templateId);
    return result;
  }

  previewQuoteTemplate(context: RequestContext, templateId: string) {
    return this.service.previewQuoteTemplate(context.workspaceId, templateId);
  }

  getQuoteDocument(context: RequestContext, quoteId: string) {
    return this.service.buildQuoteDocument(context.workspaceId, quoteId);
  }

  getPublicQuoteByToken(token: string) {
    return this.service.getPublicQuoteByToken(token);
  }

  confirmPublicQuoteByToken(token: string, body: { action?: string }) {
    return this.service.confirmPublicQuoteByToken(token, body);
  }
}

export function toSalesHttpError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  if (error instanceof SalesAccessError) {
    return { statusCode: 404, code: "NOT_FOUND", message: error.message };
  }
  if (error instanceof SalesValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }
  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected error." };
}
