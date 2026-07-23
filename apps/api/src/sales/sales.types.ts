import type { WorkspaceMemberRole } from "../auth/auth.types";

export type SourceType =
  | "website"
  | "douyin"
  | "wechat"
  | "expo"
  | "sales_link"
  | "other";

export type IntentLevel = "low" | "medium" | "high";

export type InquiryStatus = "open" | "closed";

export type QuoteStage =
  | "collecting"
  | "engineering_review"
  | "to_quote"
  | "quoted"
  | "confirming"
  | "won"
  | "lost";

export type LostReason =
  | "price"
  | "delivery"
  | "spec_mismatch"
  | "project_paused"
  | "competitor"
  | "no_follow_up"
  | "other";

export interface InquiryRecord {
  id: string;
  workspaceId: string;
  conversationId: string;
  leadId: string | null;
  botId: string;
  sourceCode: string | null;
  sourceType: SourceType;
  intentLevel: IntentLevel;
  requirementCompleteness: number;
  needsEngineer: boolean;
  summary: string | null;
  missingFields: string[];
  riskNotes: string[];
  knownFields: Record<string, string>;
  ownerId: string | null;
  nextActionAt: string | null;
  quoteStatus: QuoteStage | "none";
  status: InquiryStatus;
  customerName: string | null;
  customerContact: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryInput {
  customerName: string;
  sourceType?: SourceType;
  sourceCode?: string | null;
  summary?: string;
  customerContact?: string | null;
  phone?: string | null;
  email?: string | null;
  intentLevel?: IntentLevel;
  nextActionAt?: string | null;
  productNeed?: string;
  quantity?: string;
  budget?: string;
  deliveryDate?: string;
  internalRemark?: string;
  channelLabel?: string;
  ownerId?: string | null;
  knownFields?: Record<string, string>;
}

export type InquiryListTab = "all" | "unassigned" | "mine" | "high_intent" | "pending_quote" | "overdue";

export interface InquiryAssignStats {
  unassignedCount: number;
  todayNewCount: number;
  highPriorityUnassignedCount: number;
  avgAssignHours: number | null;
  assignedOpenCount: number;
  monthAssignedCount: number;
}

export interface InquiryAssignCandidate {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceMemberRole;
  currentLoad: number;
  maxCapacity: number;
  loadRate: number;
  matchScore: number;
  status: "idle" | "normal" | "busy";
  reason: string;
  recommended: boolean;
}

export interface QuoteLineItem {
  id?: string;
  name: string;
  model?: string;
  qty: number;
  unit?: string;
  price: number;
  discount?: number;
  deliveryCycle?: string;
}

export interface QuoteAttachmentMeta {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt?: string;
}

export interface QuoteDetails {
  lineItems?: QuoteLineItem[];
  freight?: number;
  install?: number;
  other?: number;
  taxRate?: number;
  attachmentIds?: string[];
  attachments?: QuoteAttachmentMeta[];
  remark?: string;
}

export interface QuoteOpportunityRecord {
  id: string;
  workspaceId: string;
  inquiryId: string;
  templateId: string | null;
  stage: QuoteStage;
  estimatedAmount: number | null;
  quotedAmount: number | null;
  wonAmount: number | null;
  lostReason: LostReason | null;
  quoteDueAt: string | null;
  ownerId: string | null;
  nextFollowUpAt: string | null;
  title: string | null;
  details: QuoteDetails;
  createdAt: string;
  updatedAt: string;
}

export interface QuotePublicLinkRecord {
  id: string;
  workspaceId: string;
  quoteOpportunityId: string;
  tokenHash: string;
  tokenPrefix: string;
  status: "active" | "revoked";
  createdBy: string | null;
  createdAt: string;
  lastAccessedAt: string | null;
  confirmedAt: string | null;
}

export interface QuoteFollowUpRecord {
  id: string;
  quoteOpportunityId: string;
  kind: "note" | "status" | "assignee" | "system";
  title: string;
  body?: string | null;
  actor?: string | null;
  createdAt: string;
}

export interface SourceCodeRecord {
  id: string;
  workspaceId: string;
  code: string;
  label: string;
  sourceType: SourceType;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface BusinessRulesRecord {
  workspaceId: string;
  rules: BusinessRulesPayload;
  updatedAt: string;
}

export interface BusinessRulesPayload {
  highIntentKeywords: string[];
  requiredQuoteFields: string[];
  leadFields: string[];
  highIntentReminderMinutes: number;
  transferToHumanKeywords: string[];
}

export interface SalesOverviewMetrics {
  effectiveInquiries: number;
  highIntentCount: number;
  pendingQuoteCount: number;
  quotedCount: number;
  wonCount: number;
  estimatedAmountTotal: number | null;
  wonAmountTotal: number | null;
}

export interface ConversionFunnelStep {
  key: string;
  label: string;
  count: number;
}

export interface ChannelAttributionItem {
  sourceCode: string | null;
  sourceLabel: string;
  sourceType: SourceType;
  inquiryCount: number;
  quoteCount: number;
  wonCount: number;
  wonAmountTotal: number | null;
}

export interface SourceAnalyticsItem extends ChannelAttributionItem {
  visitCount: number | null;
  conversationCount: number;
  requirementCompleteCount: number;
  roi: number | null;
}

export interface CustomerOpportunityItem {
  id: string;
  inquiryId: string;
  quoteOpportunityId: string | null;
  customerName: string;
  customerContact: string | null;
  stage: QuoteStage | "collecting";
  lifecycleColumn:
    | "awaiting_first_contact"
    | "collecting_requirements"
    | "quoting"
    | "won_or_repeat"
    | "silent_risk";
  ownerId: string | null;
  nextFollowUpAt: string | null;
  updatedAt: string;
}

export interface CustomerOperationRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface SalesAssistantAnalyzeResult {
  summary: string;
  knownParameters: Record<string, string>;
  missingParameters: string[];
  needsDrawing: boolean;
  needsEngineer: boolean;
  riskNotes: string[];
  suggestedReply: string;
  requirementSheet: Array<{ field: string; value: string | null; required: boolean }>;
}

export type QuoteTemplateLogoPosition = "left" | "center" | "right";

export interface QuoteTemplateTerms {
  payment: string;
  delivery: string;
  validity: string;
}

export interface QuoteTemplateRecord {
  id: string;
  workspaceId: string;
  templateName: string;
  companyName: string;
  description: string;
  themeColor: string;
  logoPosition: QuoteTemplateLogoPosition;
  showCompanyInfo: boolean;
  showCustomerInfo: boolean;
  fields: string[];
  terms: QuoteTemplateTerms;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotePreviewProduct {
  name: string;
  model: string;
  qty: number;
  unit: string;
  price: number;
  amount: number;
  deliveryCycle?: string;
  discount?: number;
}

export interface QuotePreviewSample {
  quoteNo: string;
  date: string;
  validUntil: string;
  currency: string;
  company: { name: string; enName: string; address: string; phone: string; logoUrl?: string };
  customer: { name: string; contact: string; phone: string; email: string };
  products: QuotePreviewProduct[];
  remark?: string;
}

export interface QuoteDocumentPayload {
  template: Omit<QuoteTemplateRecord, "workspaceId">;
  sample: QuotePreviewSample;
  html: string;
}
