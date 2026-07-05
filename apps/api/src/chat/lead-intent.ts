import type { BotRecord } from "../rag/rag.types";
import type { RagSearchResult } from "../rag/rag.types";

/** 护栏 §7.1 高意向触发关键词 */
export const HIGH_INTENT_KEYWORDS = [
  "报价",
  "价格",
  "多少钱",
  "询价",
  "图纸",
  "cad",
  "pdf",
  "定制",
  "非标",
  "样品",
  "交期",
  "采购",
  "合同",
  "下单",
  "联系方式",
  "电话",
  "邮箱",
  "项目",
  "招标",
  "参数确认",
] as const;

export const DEFAULT_INDUSTRIAL_LEAD_FIELDS = [
  "name",
  "phone",
  "email",
  "company",
  "requirement",
  "productType",
  "quantity",
] as const;

const REQUIRED_LEAD_FIELDS = new Set(["name", "company", "requirement"]);

const FIELD_LABELS: Record<string, string> = {
  name: "姓名或称呼",
  phone: "电话",
  email: "邮箱",
  company: "公司",
  requirement: "需求描述",
  productType: "产品类型",
  environment: "使用环境",
  dimensions: "尺寸",
  quantity: "数量",
  drawingAttachment: "图纸附件",
};

export function detectHighIntent(query: string): boolean {
  const normalized = query.toLowerCase();
  return HIGH_INTENT_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function applyLeadCaptureRules(
  retrieval: RagSearchResult,
  bot: BotRecord,
  query: string,
): RagSearchResult {
  const highIntent = detectHighIntent(query);
  const ragMiss = retrieval.needsLeadCapture;

  let needsLeadCapture = highIntent;

  if (ragMiss && bot.collectLeadsOnFailure) {
    needsLeadCapture = true;
  }

  if (ragMiss && !bot.collectLeadsOnFailure && !highIntent) {
    needsLeadCapture = false;
  }

  return {
    ...retrieval,
    needsLeadCapture,
  };
}

export function buildSessionSummary(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter((item) => item.role === "user").map((item) => item.content.trim());
  const assistantMessages = messages
    .filter((item) => item.role === "assistant")
    .map((item) => item.content.trim());

  if (userMessages.length === 0) {
    return "访客尚未发送有效消息。";
  }

  const keyQuestion = userMessages[0]?.slice(0, 120) ?? "";
  const latestUser = userMessages.at(-1)?.slice(0, 120) ?? "";
  const latestAssistant = assistantMessages.at(-1)?.slice(0, 160) ?? "";

  const parts = [`关键问题：${keyQuestion}`];
  if (latestUser && latestUser !== keyQuestion) {
    parts.push(`最新提问：${latestUser}`);
  }
  if (latestAssistant) {
    parts.push(`AI 回复摘要：${latestAssistant}`);
  }

  return parts.join("；");
}

export function extractKeyQuestion(messages: Array<{ role: string; content: string }>): string {
  const firstUser = messages.find((item) => item.role === "user" && item.content.trim());
  return firstUser?.content.trim().slice(0, 200) ?? "";
}

export function validateLeadFields(
  configuredFields: string[],
  fields: Record<string, string>,
): void {
  const activeFields = configuredFields.length > 0 ? configuredFields : [...DEFAULT_INDUSTRIAL_LEAD_FIELDS];

  for (const field of activeFields) {
    if (REQUIRED_LEAD_FIELDS.has(field) && !fields[field]?.trim()) {
      const label = FIELD_LABELS[field] ?? field;
      throw new Error(`请填写${label}。`);
    }
  }

  const hasContact = Boolean(fields.phone?.trim() || fields.email?.trim());
  if (activeFields.includes("phone") || activeFields.includes("email")) {
    if (!hasContact) {
      throw new Error("请至少填写电话或邮箱。");
    }
  }
}

export function normalizeLeadFieldError(error: unknown): string {
  return error instanceof Error ? error.message : "留资字段校验失败。";
}
