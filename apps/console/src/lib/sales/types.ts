export type IntentLevel = "low" | "medium" | "high";
export type SourceType =
  | "website"
  | "douyin"
  | "wechat"
  | "expo"
  | "sales_link"
  | "other";

export type QuoteStage =
  | "collecting"
  | "engineering_review"
  | "to_quote"
  | "quoted"
  | "confirming"
  | "won"
  | "lost"
  | "none";

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

export interface InquiryListItem {
  id: string;
  conversationId: string;
  leadId: string | null;
  botId: string;
  botName: string;
  customerName: string;
  customerContact: string | null;
  sourceCode: string | null;
  sourceType: SourceType;
  intentLevel: IntentLevel;
  requirementCompleteness: number;
  summary: string | null;
  missingFields: string[];
  needsEngineer: boolean;
  ownerId: string | null;
  nextActionAt: string | null;
  quoteStatus: QuoteStage;
  status: "open" | "closed";
  updatedAt: string;
  createdAt: string;
}

export interface InquiryDetail extends InquiryListItem {
  riskNotes: string[];
  knownFields: Record<string, string>;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>;
  attachments: Array<{ id: string; fileName: string; sizeBytes: number }>;
  aiInsight: {
    intent: string | null;
    productLine: string | null;
    confidence: number | null;
    missingFields: string[];
    suggestedQuestions: string[];
  } | null;
  quoteOpportunities: QuoteListItem[];
}

export interface QuoteListItem {
  id: string;
  inquiryId: string;
  stage: QuoteStage;
  stageLabel: string;
  title: string;
  customerName: string;
  customerContact: string | null;
  estimatedAmount: number | null;
  quotedAmount: number | null;
  wonAmount: number | null;
  lostReason: string | null;
  quoteDueAt: string | null;
  ownerId: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDetail extends QuoteListItem {
  followUps: Array<{
    id: string;
    kind: string;
    title: string;
    body?: string | null;
    actor?: string | null;
    createdAt: string;
  }>;
}

export interface SourceCodeItem {
  id: string;
  code: string;
  label: string;
  sourceType: SourceType;
  status: "active" | "disabled";
}

export interface CustomerOpportunityItem {
  id: string;
  inquiryId: string;
  quoteOpportunityId: string | null;
  customerName: string;
  customerContact: string | null;
  stage: QuoteStage;
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

export interface CustomerRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

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
  role: "owner" | "admin" | "member" | "viewer";
  currentLoad: number;
  maxCapacity: number;
  loadRate: number;
  matchScore: number;
  status: "idle" | "normal" | "busy";
  reason: string;
  recommended: boolean;
}

export interface BusinessRules {
  highIntentKeywords: string[];
  requiredQuoteFields: string[];
  leadFields: string[];
  highIntentReminderMinutes: number;
  transferToHumanKeywords: string[];
}

export interface SalesAssistantResult {
  summary: string;
  knownParameters: Record<string, string>;
  missingParameters: string[];
  needsDrawing: boolean;
  needsEngineer: boolean;
  riskNotes: string[];
  suggestedReply: string;
  requirementSheet: Array<{ field: string; value: string | null; required: boolean }>;
}

export const INTENT_LABELS: Record<IntentLevel, string> = {
  high: "高意向",
  medium: "中意向",
  low: "低意向",
};

export const INQUIRY_STATUS_LABELS: Record<"open" | "closed", string> = {
  open: "进行中",
  closed: "已结案",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  website: "官网",
  douyin: "抖音",
  wechat: "微信",
  expo: "展会",
  sales_link: "销售链接",
  other: "其他",
};

export const QUOTE_STAGE_LABELS: Record<string, string> = {
  none: "未创建",
  collecting: "待补资料",
  engineering_review: "待工程确认",
  to_quote: "待报价",
  quoted: "已报价",
  confirming: "客户确认中",
  won: "已成交",
  lost: "已丢单",
};

export function getQuoteStageLabel(stage: QuoteStage | string): string {
  return QUOTE_STAGE_LABELS[stage] ?? String(stage);
}

export const LIFECYCLE_COLUMNS = [
  { key: "awaiting_first_contact", label: "待首次联系" },
  { key: "collecting_requirements", label: "需求补充中" },
  { key: "quoting", label: "报价中" },
  { key: "won_or_repeat", label: "成交/复购" },
  { key: "silent_risk", label: "沉默风险" },
] as const;
