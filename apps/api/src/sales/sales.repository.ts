import type {
  BusinessRulesPayload,
  BusinessRulesRecord,
  InquiryRecord,
  QuotePublicLinkRecord,
  QuoteFollowUpRecord,
  QuoteOpportunityRecord,
  QuoteTemplateRecord,
  SourceCodeRecord,
} from "./sales.types";

export interface SalesRepository {
  listInquiries(
    workspaceId: string,
    ownerId?: string | null,
  ): Promise<InquiryRecord[]>;
  findInquiryById(
    workspaceId: string,
    id: string,
  ): Promise<InquiryRecord | null>;
  upsertInquiry(record: InquiryRecord): Promise<InquiryRecord>;
  updateInquiry(
    workspaceId: string,
    id: string,
    patch: Partial<InquiryRecord>,
  ): Promise<InquiryRecord | null>;

  listQuoteOpportunities(
    workspaceId: string,
    ownerId?: string | null,
  ): Promise<QuoteOpportunityRecord[]>;
  findQuoteOpportunityById(
    workspaceId: string,
    id: string,
  ): Promise<QuoteOpportunityRecord | null>;
  listQuoteOpportunitiesByInquiry(inquiryId: string): Promise<QuoteOpportunityRecord[]>;
  createQuoteOpportunity(record: QuoteOpportunityRecord): Promise<QuoteOpportunityRecord>;
  updateQuoteOpportunity(
    workspaceId: string,
    id: string,
    patch: Partial<QuoteOpportunityRecord>,
  ): Promise<QuoteOpportunityRecord | null>;

  listQuoteFollowUps(quoteOpportunityId: string): Promise<QuoteFollowUpRecord[]>;
  createQuoteFollowUp(record: QuoteFollowUpRecord): Promise<QuoteFollowUpRecord>;
  findQuotePublicLinkByQuoteId(
    workspaceId: string,
    quoteOpportunityId: string,
  ): Promise<QuotePublicLinkRecord | null>;
  findQuotePublicLinkByTokenHash(tokenHash: string): Promise<QuotePublicLinkRecord | null>;
  upsertQuotePublicLink(record: QuotePublicLinkRecord): Promise<QuotePublicLinkRecord>;
  touchQuotePublicLinkAccess(
    id: string,
    patch: Pick<QuotePublicLinkRecord, "lastAccessedAt" | "confirmedAt" | "status">,
  ): Promise<QuotePublicLinkRecord | null>;

  listSourceCodes(workspaceId: string): Promise<SourceCodeRecord[]>;
  createSourceCode(record: SourceCodeRecord): Promise<SourceCodeRecord>;
  findSourceCodeByCode(workspaceId: string, code: string): Promise<SourceCodeRecord | null>;

  getBusinessRules(workspaceId: string): Promise<BusinessRulesRecord | null>;
  upsertBusinessRules(record: BusinessRulesRecord): Promise<BusinessRulesRecord>;

  listQuoteTemplates(workspaceId: string): Promise<QuoteTemplateRecord[]>;
  findQuoteTemplateById(workspaceId: string, id: string): Promise<QuoteTemplateRecord | null>;
  findDefaultQuoteTemplate(workspaceId: string): Promise<QuoteTemplateRecord | null>;
  createQuoteTemplate(record: QuoteTemplateRecord): Promise<QuoteTemplateRecord>;
  updateQuoteTemplate(
    workspaceId: string,
    id: string,
    patch: Partial<QuoteTemplateRecord>,
  ): Promise<QuoteTemplateRecord | null>;
  deleteQuoteTemplate(workspaceId: string, id: string): Promise<boolean>;
  clearDefaultQuoteTemplate(workspaceId: string, exceptId?: string): Promise<void>;
}

export class InMemorySalesRepository implements SalesRepository {
  private readonly inquiries = new Map<string, InquiryRecord>();
  private readonly quotes = new Map<string, QuoteOpportunityRecord>();
  private readonly followUps = new Map<string, QuoteFollowUpRecord>();
  private readonly quotePublicLinks = new Map<string, QuotePublicLinkRecord>();
  private readonly sources = new Map<string, SourceCodeRecord>();
  private readonly rules = new Map<string, BusinessRulesRecord>();
  private readonly quoteTemplates = new Map<string, QuoteTemplateRecord>();

  loadSnapshot(input: {
    inquiries?: InquiryRecord[];
    quoteOpportunities?: QuoteOpportunityRecord[];
    followUps?: QuoteFollowUpRecord[];
    quotePublicLinks?: QuotePublicLinkRecord[];
    sourceCodes?: SourceCodeRecord[];
    businessRules?: BusinessRulesRecord[];
    quoteTemplates?: QuoteTemplateRecord[];
  }): void {
    for (const item of input.inquiries ?? []) {
      this.inquiries.set(item.id, item);
    }
    for (const item of input.quoteOpportunities ?? []) {
      this.quotes.set(item.id, item);
    }
    for (const item of input.followUps ?? []) {
      this.followUps.set(item.id, item);
    }
    for (const item of input.quotePublicLinks ?? []) {
      this.quotePublicLinks.set(item.id, item);
    }
    for (const item of input.sourceCodes ?? []) {
      this.sources.set(item.id, item);
    }
    for (const item of input.businessRules ?? []) {
      this.rules.set(item.workspaceId, item);
    }
    for (const item of input.quoteTemplates ?? []) {
      this.quoteTemplates.set(item.id, item);
    }
  }

  async listInquiries(
    workspaceId: string,
    ownerId?: string | null,
  ): Promise<InquiryRecord[]> {
    return [...this.inquiries.values()]
      .filter(
        (item) =>
          item.workspaceId === workspaceId &&
          (!ownerId || item.ownerId === ownerId),
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }

  async findInquiryById(
    workspaceId: string,
    id: string,
  ): Promise<InquiryRecord | null> {
    const record = this.inquiries.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  async upsertInquiry(record: InquiryRecord): Promise<InquiryRecord> {
    this.inquiries.set(record.id, record);
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
    this.inquiries.set(id, next);
    return next;
  }

  async listQuoteOpportunities(
    workspaceId: string,
    ownerId?: string | null,
  ): Promise<QuoteOpportunityRecord[]> {
    return [...this.quotes.values()]
      .filter(
        (item) =>
          item.workspaceId === workspaceId &&
          (!ownerId || item.ownerId === ownerId),
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }

  async findQuoteOpportunityById(
    workspaceId: string,
    id: string,
  ): Promise<QuoteOpportunityRecord | null> {
    const record = this.quotes.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  async listQuoteOpportunitiesByInquiry(inquiryId: string): Promise<QuoteOpportunityRecord[]> {
    return [...this.quotes.values()].filter((item) => item.inquiryId === inquiryId);
  }

  async createQuoteOpportunity(record: QuoteOpportunityRecord): Promise<QuoteOpportunityRecord> {
    this.quotes.set(record.id, record);
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
    this.quotes.set(id, next);
    return next;
  }

  async listQuoteFollowUps(quoteOpportunityId: string): Promise<QuoteFollowUpRecord[]> {
    return [...this.followUps.values()]
      .filter((item) => item.quoteOpportunityId === quoteOpportunityId)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
  }

  async createQuoteFollowUp(record: QuoteFollowUpRecord): Promise<QuoteFollowUpRecord> {
    this.followUps.set(record.id, record);
    return record;
  }

  async findQuotePublicLinkByQuoteId(
    workspaceId: string,
    quoteOpportunityId: string,
  ): Promise<QuotePublicLinkRecord | null> {
    return (
      [...this.quotePublicLinks.values()].find(
        (item) =>
          item.workspaceId === workspaceId &&
          item.quoteOpportunityId === quoteOpportunityId &&
          item.status === "active",
      ) ?? null
    );
  }

  async findQuotePublicLinkByTokenHash(tokenHash: string): Promise<QuotePublicLinkRecord | null> {
    return (
      [...this.quotePublicLinks.values()].find(
        (item) => item.tokenHash === tokenHash && item.status === "active",
      ) ?? null
    );
  }

  async upsertQuotePublicLink(record: QuotePublicLinkRecord): Promise<QuotePublicLinkRecord> {
    const existing = await this.findQuotePublicLinkByQuoteId(
      record.workspaceId,
      record.quoteOpportunityId,
    );
    if (existing) {
      this.quotePublicLinks.delete(existing.id);
      this.quotePublicLinks.set(existing.id, { ...record, id: existing.id });
      return { ...record, id: existing.id };
    }
    this.quotePublicLinks.set(record.id, record);
    return record;
  }

  async touchQuotePublicLinkAccess(
    id: string,
    patch: Pick<QuotePublicLinkRecord, "lastAccessedAt" | "confirmedAt" | "status">,
  ): Promise<QuotePublicLinkRecord | null> {
    const current = this.quotePublicLinks.get(id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch };
    this.quotePublicLinks.set(id, next);
    return next;
  }

  async listSourceCodes(workspaceId: string): Promise<SourceCodeRecord[]> {
    return [...this.sources.values()]
      .filter((item) => item.workspaceId === workspaceId)
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
  }

  async createSourceCode(record: SourceCodeRecord): Promise<SourceCodeRecord> {
    this.sources.set(record.id, record);
    return record;
  }

  async findSourceCodeByCode(
    workspaceId: string,
    code: string,
  ): Promise<SourceCodeRecord | null> {
    const normalized = code.trim().toLowerCase();
    return (
      [...this.sources.values()].find(
        (item) =>
          item.workspaceId === workspaceId && item.code.trim().toLowerCase() === normalized,
      ) ?? null
    );
  }

  async getBusinessRules(workspaceId: string): Promise<BusinessRulesRecord | null> {
    return this.rules.get(workspaceId) ?? null;
  }

  async upsertBusinessRules(record: BusinessRulesRecord): Promise<BusinessRulesRecord> {
    this.rules.set(record.workspaceId, record);
    return record;
  }

  async listQuoteTemplates(workspaceId: string): Promise<QuoteTemplateRecord[]> {
    return [...this.quoteTemplates.values()]
      .filter((item) => item.workspaceId === workspaceId)
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }

  async findQuoteTemplateById(
    workspaceId: string,
    id: string,
  ): Promise<QuoteTemplateRecord | null> {
    const item = this.quoteTemplates.get(id);
    return item && item.workspaceId === workspaceId ? item : null;
  }

  async findDefaultQuoteTemplate(workspaceId: string): Promise<QuoteTemplateRecord | null> {
    return (
      [...this.quoteTemplates.values()].find(
        (item) => item.workspaceId === workspaceId && item.isDefault,
      ) ?? null
    );
  }

  async createQuoteTemplate(record: QuoteTemplateRecord): Promise<QuoteTemplateRecord> {
    this.quoteTemplates.set(record.id, record);
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
    this.quoteTemplates.set(id, next);
    return next;
  }

  async deleteQuoteTemplate(workspaceId: string, id: string): Promise<boolean> {
    const current = await this.findQuoteTemplateById(workspaceId, id);
    if (!current) {
      return false;
    }
    this.quoteTemplates.delete(id);
    return true;
  }

  async clearDefaultQuoteTemplate(workspaceId: string, exceptId?: string): Promise<void> {
    for (const item of this.quoteTemplates.values()) {
      if (item.workspaceId === workspaceId && item.isDefault && item.id !== exceptId) {
        this.quoteTemplates.set(item.id, { ...item, isDefault: false });
      }
    }
  }
}

export function defaultBusinessRulesPayload(): BusinessRulesPayload {
  return {
    highIntentKeywords: [
      "报价",
      "价格",
      "多少钱",
      "询价",
      "图纸",
      "定制",
      "非标",
      "交期",
      "采购",
      "合同",
      "下单",
    ],
    requiredQuoteFields: ["productType", "quantity", "dimensions", "environment"],
    leadFields: ["name", "phone", "email", "company", "requirement", "productType", "quantity"],
    highIntentReminderMinutes: 10,
    transferToHumanKeywords: ["工程师", "人工", "转人工", "电话沟通"],
  };
}
