import type { BusinessRulesPayload, IntentLevel, SalesAssistantAnalyzeResult, SourceType } from "../sales/sales.types";
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
}

const PHONE_PATTERN = /(?:\+?86[-\s]?)?1[3-9]\d[\d\s-]{8,10}|(?:\d{3,4}[-\s]?)?\d{7,8}/u;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

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

export function extractQuickEntryFields(text: string, rules: BusinessRulesPayload): QuickEntryExtractResult {
  const trimmed = text.trim();
  const suggestedFields = analyzeSalesContent({ text: trimmed, rules });
  const known = { ...suggestedFields.knownParameters };
  const phone = capture(trimmed, PHONE_PATTERN).replace(/[\s-]+/g, "");
  const email = capture(trimmed, EMAIL_PATTERN);
  const contact =
    capture(trimmed, /(?:联系人|对接人|负责人)[:：\s]*([\u4e00-\u9fa5A-Za-z·]{2,20})/u) ||
    capture(trimmed, /([\u4e00-\u9fa5]{1,8}(?:经理|总监|主任|工程师|先生|女士|工))(?:\s|，|,|。|$)/u) ||
    known.name?.trim() || "";
  const customerName =
    known.company?.trim() ||
    capture(trimmed, /(?:客户|公司|单位)[:：\s]*([^\n，,。;；]{2,50})/u) ||
    capture(trimmed, /([\u4e00-\u9fa5A-Za-z0-9（）()&·-]{2,50}(?:有限公司|集团|研究院|工厂))/u);
  const productNeed =
    known.productType?.trim() || known.requirement?.trim() ||
    capture(trimmed, /(?:需要|需求|产品|型号)[:：\s]*([^\n，,。;；]{2,60})/u);
  const quantity = capture(trimmed, /(?:数量|采购|需要)[:：\s]*(\d+(?:\.\d+)?\s*(?:台|套|件|个|批|米|吨))/u) ||
    capture(trimmed, /(\d+(?:\.\d+)?\s*(?:台|套|件|个|批|米|吨))/u);
  const budget = capture(trimmed, /(?:预算|报价|金额)[:：\s]*([^\n，,。;；]{2,40})/u) ||
    capture(trimmed, /(\d+(?:\.\d+)?\s*(?:万|万元|元|人民币|USD|美元)(?:\s*[-~至]\s*\d+(?:\.\d+)?\s*(?:万|万元|元|USD|美元))?)/iu);
  const deliveryDate = capture(trimmed, /(?:交期|交付|发货|到货)[:：\s]*([^\n，,。;；]{2,30})/u) ||
    capture(trimmed, /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?|\d{1,2}月底前?)/u);
  const sourceType = detectSourceType(trimmed);
  const intentLevel = detectIntentLevel(trimmed, suggestedFields);

  Object.assign(known, Object.fromEntries(Object.entries({
    phone, email, name: contact, company: customerName, productType: productNeed,
    quantity, budget, deliveryDate,
  }).filter(([, value]) => Boolean(value))));

  return {
    customerName, contact, phone, email, sourceType, productNeed, quantity, budget,
    deliveryDate, intentLevel,
    summary: trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed || suggestedFields.summary,
    suggestedFields: { ...suggestedFields, knownParameters: known },
    fieldConfidence: Object.fromEntries(Object.entries({
      customerName, contact, phone, email, productNeed, quantity, budget, deliveryDate,
    }).map(([key, value]) => [key, Boolean(value)]).concat([
      ["sourceType", sourceType !== "other"],
      ["intentLevel", intentLevel !== "medium"],
    ])),
  };
}
