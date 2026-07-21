import type { IntentLevel, InquiryListItem, SalesAssistantResult, SourceType } from "@/lib/sales/types";

export const QUICK_ENTRY_FIELD_KEYS = [
  "客户名称",
  "联系人",
  "联系电话",
  "来源渠道",
  "产品需求",
  "预算范围",
  "优先级",
  "交期",
] as const;

export type QuickEntryFieldKey = (typeof QUICK_ENTRY_FIELD_KEYS)[number];

export interface QuickEntryExtractResponse {
  customerName: string;
  contact: string;
  phone: string;
  email: string;
  sourceType: SourceType;
  productNeed: string;
  budget: string;
  deliveryDate: string;
  intentLevel: IntentLevel;
  summary: string;
  suggestedFields: SalesAssistantResult;
  fieldConfidence: Record<string, boolean>;
  /** Present when API supports LLM extract; omit on older responses. */
  extractMode?: "llm" | "rules";
}

const CHANNEL_TO_SOURCE: Record<string, SourceType> = {
  官网表单: "website",
  销售链接: "sales_link",
  抖音: "douyin",
  展会: "expo",
  微信: "wechat",
  电话呼入: "other",
  老客户推荐: "other",
  "Google Ads": "website",
};

const SOURCE_TO_CHANNEL_LABEL: Record<SourceType, string> = {
  website: "官网表单",
  sales_link: "销售链接",
  douyin: "抖音",
  expo: "展会",
  wechat: "微信",
  other: "其他",
};

export function channelLabelToSourceType(label: string): SourceType {
  return CHANNEL_TO_SOURCE[label.trim()] ?? "other";
}

export function sourceTypeToChannelLabel(sourceType: SourceType): string {
  return SOURCE_TO_CHANNEL_LABEL[sourceType] ?? "其他";
}

export function intentLevelToLabel(level: IntentLevel): string {
  if (level === "high") return "高";
  if (level === "low") return "低";
  return "中";
}

export function labelToIntentLevel(label: string): IntentLevel {
  if (label.includes("高")) return "high";
  if (label.includes("低")) return "low";
  return "medium";
}

export function mapExtractResponseToFields(
  result: QuickEntryExtractResponse,
): Record<QuickEntryFieldKey, string> {
  const known = result.suggestedFields?.knownParameters ?? {};
  return {
    客户名称: result.customerName || known.company || "",
    联系人: result.contact || known.name || "",
    联系电话: result.phone || known.phone || "",
    来源渠道: sourceTypeToChannelLabel(result.sourceType),
    产品需求: result.productNeed || known.productType || known.requirement || "",
    预算范围: result.budget || known.budget || "",
    优先级: intentLevelToLabel(result.intentLevel),
    交期: result.deliveryDate || known.deliveryDate || "",
  };
}

export function buildQuickEntrySummary(input: {
  customer: string;
  contact?: string;
  phone?: string;
  channel?: string;
  need?: string;
  budget?: string;
  priority?: IntentLevel;
  followUp?: string;
  remark?: string;
}): string {
  const lines = [
    input.need ? `产品需求：${input.need}` : null,
    input.contact ? `联系人：${input.contact}` : null,
    input.phone ? `电话：${input.phone}` : null,
    input.channel ? `来源：${input.channel}` : null,
    input.budget ? `预算：${input.budget}` : null,
    input.priority ? `优先级：${intentLevelToLabel(input.priority)}` : null,
    input.followUp ? `下次跟进：${input.followUp}` : null,
    input.remark?.trim() ? `备注：${input.remark.trim()}` : null,
  ].filter(Boolean);
  return lines.join("；") || `${input.customer} 快速录入询盘`;
}

export function buildCreateInquirySummary(input: {
  customerName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  productName?: string;
  quantity?: string;
  budget?: string;
  deliveryDate?: string;
  channelLabel?: string;
  internalRemark?: string;
}): string {
  const lines = [
    input.productName ? `产品：${input.productName}` : null,
    input.quantity ? `数量：${input.quantity}` : null,
    input.contactName ? `联系人：${input.contactName}` : null,
    input.email ? `邮箱：${input.email}` : null,
    input.phone ? `电话：${input.phone}` : null,
    input.budget ? `预算：${input.budget}` : null,
    input.deliveryDate ? `交期：${input.deliveryDate}` : null,
    input.channelLabel ? `来源：${input.channelLabel}` : null,
    input.internalRemark?.trim() ? `内部备注：${input.internalRemark.trim()}` : null,
  ].filter(Boolean);
  return lines.join("；") || `${input.customerName} 新建询盘`;
}

const CHANNEL_KEY_TO_SOURCE: Record<string, SourceType> = {
  site: "website",
  ads: "website",
  social: "other",
  expo: "expo",
  ref: "other",
  email: "other",
  other: "other",
};

export function newInquiryChannelToSourceType(channelKey: string): SourceType {
  return CHANNEL_KEY_TO_SOURCE[channelKey] ?? "other";
}

export function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "");
}

export function findDuplicateInquiry(
  phone: string,
  inquiries: InquiryListItem[],
): InquiryListItem | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return (
    inquiries.find((item) => {
      const contact = item.customerContact ? normalizePhone(item.customerContact) : "";
      return contact && (contact === normalized || contact.includes(normalized) || normalized.includes(contact));
    }) ?? null
  );
}

export function formatInquiryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
