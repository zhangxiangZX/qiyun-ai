import type { OpenAICompatibleChatClient } from "../llm/llm-chat";
import type {
  BusinessRulesPayload,
  IntentLevel,
  SalesAssistantAnalyzeResult,
  SourceType,
} from "../sales/sales.types";
import { analyzeSalesContent } from "../sales/sales-assistant.service";

export interface QuickEntryExtractResult {
  customerName: string;
  contact: string;
  phone: string;
  email: string;
  sourceType: SourceType;
  productNeed: string;
  quantity: string;
  budget: string;
  deliveryDate: string;
  intentLevel: IntentLevel;
  summary: string;
  suggestedFields: SalesAssistantAnalyzeResult;
  fieldConfidence: Record<string, boolean>;
  /** Whether structured fields primarily came from LLM. */
  extractMode: "llm" | "rules";
}

const PHONE_PATTERN = /(?:\+?86[-\s]?)?1[3-9]\d[\d\s-]{8,10}|(?:\d{3,4}[-\s]?)?\d{7,8}/u;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const SOURCE_TYPES = new Set<SourceType>([
  "website",
  "sales_link",
  "douyin",
  "expo",
  "wechat",
  "other",
]);

const INTENT_LEVELS = new Set<IntentLevel>(["low", "medium", "high"]);

function capture(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return (match?.slice(1).find(Boolean) ?? match?.[0] ?? "").trim();
}

function detectSourceType(text: string): SourceType {
  if (/抖音|douyin/i.test(text)) return "douyin";
  if (/微信|wechat/i.test(text)) return "wechat";
  if (/展会|展位|展台/i.test(text)) return "expo";
  if (/销售链接|二维码|推广链接/i.test(text)) return "sales_link";
  if (/官网|独立站|网站|google\s*ads|表单/i.test(text)) return "website";
  return "other";
}

function detectIntentLevel(text: string, analysis: SalesAssistantAnalyzeResult): IntentLevel {
  if (/低优先级|不急|低意向/u.test(text)) return "low";
  if (/高优先级|紧急|尽快|高意向|报价|价格|采购|合同/u.test(text)) return "high";
  return analysis.needsEngineer ? "high" : "medium";
}

function asTrimmedString(value: unknown, maxLen = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function normalizeSourceType(value: unknown): SourceType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase() as SourceType;
  return SOURCE_TYPES.has(normalized) ? normalized : null;
}

function normalizeIntentLevel(value: unknown): IntentLevel | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase() as IntentLevel;
  return INTENT_LEVELS.has(normalized) ? normalized : null;
}

function stripCodeFences(input: string): string {
  return input
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

function withConfidence(result: Omit<QuickEntryExtractResult, "fieldConfidence" | "extractMode"> & {
  extractMode: QuickEntryExtractResult["extractMode"];
}): QuickEntryExtractResult {
  return {
    ...result,
    fieldConfidence: Object.fromEntries(
      Object.entries({
        customerName: result.customerName,
        contact: result.contact,
        phone: result.phone,
        email: result.email,
        productNeed: result.productNeed,
        quantity: result.quantity,
        budget: result.budget,
        deliveryDate: result.deliveryDate,
      })
        .map(([key, value]) => [key, Boolean(value)])
        .concat([
          ["sourceType", result.sourceType !== "other"],
          ["intentLevel", result.intentLevel !== "medium"],
        ]),
    ),
  };
}

/** Rule-based extractor — used as fallback when LLM is unavailable. */
export function extractQuickEntryFields(
  text: string,
  rules: BusinessRulesPayload,
): QuickEntryExtractResult {
  const trimmed = text.trim();
  const suggestedFields = analyzeSalesContent({ text: trimmed, rules });
  const known = { ...suggestedFields.knownParameters };
  const phone = capture(trimmed, PHONE_PATTERN).replace(/[\s-]+/g, "");
  const email = capture(trimmed, EMAIL_PATTERN);
  const contact =
    capture(trimmed, /(?:联系人|对接人|负责人)[:：\s]*([\u4e00-\u9fa5A-Za-z·]{2,20})/u) ||
    capture(trimmed, /([\u4e00-\u9fa5]{1,8}(?:经理|总监|主任|工程师|先生|女士|工))(?:\s|，|,|。|$)/u) ||
    known.name?.trim() ||
    "";
  const customerName =
    known.company?.trim() ||
    capture(trimmed, /(?:客户|公司|单位)[:：\s]*([^\n，,。;；]{2,50})/u) ||
    capture(trimmed, /([\u4e00-\u9fa5A-Za-z0-9（）()&·-]{2,50}(?:有限公司|集团|研究院|工厂))/u);
  const productNeed =
    known.productType?.trim() ||
    known.requirement?.trim() ||
    capture(trimmed, /(?:需要|需求|产品|型号)[:：\s]*([^\n，,。;；]{2,60})/u);
  const quantity =
    capture(trimmed, /(?:数量|采购|需要)[:：\s]*(\d+(?:\.\d+)?\s*(?:台|套|件|个|批|米|吨))/u) ||
    capture(trimmed, /(\d+(?:\.\d+)?\s*(?:台|套|件|个|批|米|吨))/u);
  const budget =
    capture(trimmed, /(?:预算|报价|金额)[:：\s]*([^\n，,。;；]{2,40})/u) ||
    capture(
      trimmed,
      /(\d+(?:\.\d+)?\s*(?:万|万元|元|人民币|USD|美元)(?:\s*[-~至]\s*\d+(?:\.\d+)?\s*(?:万|万元|元|USD|美元))?)/iu,
    );
  const deliveryDate =
    capture(trimmed, /(?:交期|交付|发货|到货)[:：\s]*([^\n，,。;；]{2,30})/u) ||
    capture(trimmed, /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?|\d{1,2}月底前?)/u);
  const sourceType = detectSourceType(trimmed);
  const intentLevel = detectIntentLevel(trimmed, suggestedFields);

  Object.assign(
    known,
    Object.fromEntries(
      Object.entries({
        phone,
        email,
        name: contact,
        company: customerName,
        productType: productNeed,
        quantity,
        budget,
        deliveryDate,
      }).filter(([, value]) => Boolean(value)),
    ),
  );

  return withConfidence({
    customerName,
    contact,
    phone,
    email,
    sourceType,
    productNeed,
    quantity,
    budget,
    deliveryDate,
    intentLevel,
    summary:
      trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed || suggestedFields.summary,
    suggestedFields: { ...suggestedFields, knownParameters: known },
    extractMode: "rules",
  });
}

function prefer(primary: string, fallback: string): string {
  return primary.trim() || fallback.trim();
}

function mergeLlmWithRules(
  llm: Partial<{
    customerName: string;
    contact: string;
    phone: string;
    email: string;
    sourceType: SourceType;
    productNeed: string;
    quantity: string;
    budget: string;
    deliveryDate: string;
    intentLevel: IntentLevel;
    summary: string;
  }>,
  rulesResult: QuickEntryExtractResult,
): QuickEntryExtractResult {
  const phone = prefer(llm.phone ?? "", rulesResult.phone).replace(/[\s-]+/g, "");
  const email = prefer(llm.email ?? "", rulesResult.email);
  const contact = prefer(llm.contact ?? "", rulesResult.contact);
  const customerName = prefer(llm.customerName ?? "", rulesResult.customerName);
  const productNeed = prefer(llm.productNeed ?? "", rulesResult.productNeed);
  const quantity = prefer(llm.quantity ?? "", rulesResult.quantity);
  const budget = prefer(llm.budget ?? "", rulesResult.budget);
  const deliveryDate = prefer(llm.deliveryDate ?? "", rulesResult.deliveryDate);
  const sourceType = llm.sourceType ?? rulesResult.sourceType;
  const intentLevel = llm.intentLevel ?? rulesResult.intentLevel;
  const summary = prefer(llm.summary ?? "", rulesResult.summary);

  const known = {
    ...rulesResult.suggestedFields.knownParameters,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(contact ? { name: contact } : {}),
    ...(customerName ? { company: customerName } : {}),
    ...(productNeed ? { productType: productNeed } : {}),
    ...(quantity ? { quantity } : {}),
    ...(budget ? { budget } : {}),
    ...(deliveryDate ? { deliveryDate } : {}),
  };

  return withConfidence({
    customerName,
    contact,
    phone,
    email,
    sourceType,
    productNeed,
    quantity,
    budget,
    deliveryDate,
    intentLevel,
    summary: summary.length > 200 ? `${summary.slice(0, 197)}...` : summary,
    suggestedFields: {
      ...rulesResult.suggestedFields,
      summary: summary || rulesResult.suggestedFields.summary,
      knownParameters: known,
    },
    extractMode: "llm",
  });
}

/**
 * Prefer LLM structured extraction; fall back to rule-based extract when LLM is
 * unavailable or returns unusable JSON. Never invent industrial specs — only
 * extract what the sales note already says.
 */
export async function extractQuickEntryFieldsWithLlm(
  llmChat: OpenAICompatibleChatClient | null,
  text: string,
  rules: BusinessRulesPayload,
): Promise<QuickEntryExtractResult> {
  const rulesResult = extractQuickEntryFields(text, rules);
  if (!llmChat) {
    return rulesResult;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return rulesResult;
  }

  const prompt = [
    "你是工业设备企业的销售线索结构化助手。",
    "任务：从销售粘贴的原始备注中提取字段，只输出合法 JSON，不要解释。",
    "硬性规则：",
    "1. 只能提取原文已出现的信息，禁止编造型号、参数、报价、交期、认证。",
    "2. 原文没有的字段填空字符串 \"\"。",
    "3. sourceType 只能是：website | sales_link | douyin | expo | wechat | other",
    "4. intentLevel 只能是：low | medium | high",
    "5. summary 用中文概括需求，不超过 120 字，不新增事实。",
    "6. phone 只保留数字（可含国家码），去掉空格与横线。",
    "JSON 字段：",
    '{',
    '  "customerName": "公司/客户名称",',
    '  "contact": "联系人",',
    '  "phone": "手机或固话",',
    '  "email": "邮箱",',
    '  "sourceType": "website|sales_link|douyin|expo|wechat|other",',
    '  "productNeed": "产品/需求简述",',
    '  "quantity": "数量含单位，如 20台",',
    '  "budget": "预算区间",',
    '  "deliveryDate": "交期描述",',
    '  "intentLevel": "low|medium|high",',
    '  "summary": "一句话摘要"',
    "}",
    "",
    "原始备注：",
    trimmed,
  ].join("\n");

  try {
    const raw = await llmChat.completeText({
      messages: [{ role: "system", content: prompt }],
      temperature: 0,
      maxTokens: 500,
    });
    const parsed = JSON.parse(stripCodeFences(raw)) as Record<string, unknown>;

    const llmFields = {
      customerName: asTrimmedString(parsed.customerName, 80),
      contact: asTrimmedString(parsed.contact, 40),
      phone: asTrimmedString(parsed.phone, 32).replace(/[\s-]+/g, ""),
      email: asTrimmedString(parsed.email, 80),
      sourceType: normalizeSourceType(parsed.sourceType) ?? undefined,
      productNeed: asTrimmedString(parsed.productNeed, 120),
      quantity: asTrimmedString(parsed.quantity, 40),
      budget: asTrimmedString(parsed.budget, 40),
      deliveryDate: asTrimmedString(parsed.deliveryDate, 40),
      intentLevel: normalizeIntentLevel(parsed.intentLevel) ?? undefined,
      summary: asTrimmedString(parsed.summary, 120),
    };

    const hasAny =
      Boolean(llmFields.customerName) ||
      Boolean(llmFields.contact) ||
      Boolean(llmFields.phone) ||
      Boolean(llmFields.email) ||
      Boolean(llmFields.productNeed) ||
      Boolean(llmFields.quantity) ||
      Boolean(llmFields.budget) ||
      Boolean(llmFields.deliveryDate) ||
      Boolean(llmFields.summary);

    if (!hasAny) {
      return rulesResult;
    }

    return mergeLlmWithRules(llmFields, rulesResult);
  } catch {
    return rulesResult;
  }
}
