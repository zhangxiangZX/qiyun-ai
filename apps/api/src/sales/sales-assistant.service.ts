import type { BusinessRulesPayload, SalesAssistantAnalyzeResult } from "./sales.types";

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

const PARAMETER_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: "productType", pattern: /(机柜|控制柜|悬臂|温控|不锈钢|户外)/u },
  { key: "quantity", pattern: /(\d+)\s*(台|套|个|件)/u },
  { key: "dimensions", pattern: /(\d+\s*[x×*]\s*\d+\s*[x×*]?\s*\d*\s*(mm|cm|m)?)/iu },
  { key: "environment", pattern: /(户外|室内|沿海|防腐|IP\d+|粉尘|高温|低温)/iu },
  { key: "company", pattern: /(有限公司|科技|电气|自动化|设备)/u },
];

function extractKnownParameters(text: string): Record<string, string> {
  const known: Record<string, string> = {};
  for (const { key, pattern } of PARAMETER_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      known[key] = match[0].trim();
    }
  }
  return known;
}

function detectMissingParameters(
  known: Record<string, string>,
  requiredFields: string[],
): string[] {
  return requiredFields
    .filter((field) => !known[field]?.trim())
    .map((field) => FIELD_LABELS[field] ?? field);
}

export function analyzeSalesContent(input: {
  text: string;
  rules: BusinessRulesPayload;
}): SalesAssistantAnalyzeResult {
  const text = input.text.trim();
  const knownParameters = extractKnownParameters(text);
  const missingParameters = detectMissingParameters(
    knownParameters,
    input.rules.requiredQuoteFields,
  );

  const needsDrawing = /图纸|cad|pdf|附件|上传/u.test(text);
  const needsEngineer =
    needsDrawing ||
    /非标|定制|防腐|ip\d+|认证|交期|温控|散热/u.test(text) ||
    missingParameters.some((field) => /尺寸|环境|图纸/.test(field));

  const riskNotes: string[] = [];
  if (/价格|报价|多少钱/u.test(text)) {
    riskNotes.push("客户询问价格，AI 不可直接承诺金额，需人工确认后报价。");
  }
  if (/交期|交付|发货/u.test(text)) {
    riskNotes.push("涉及交期，需结合库存与生产计划由销售或计划确认。");
  }
  if (/ip\d+|认证|ul|ce/u.test(text)) {
    riskNotes.push("涉及认证或防护等级，需工程师核对方案与资料。");
  }
  if (needsDrawing && !knownParameters.drawingAttachment) {
    riskNotes.push("客户可能需提交图纸，请确认附件是否齐全。");
  }

  const summary =
    text.length > 120 ? `${text.slice(0, 117)}…` : text || "未提供有效咨询内容。";

  const suggestedReply = buildSuggestedReply({
    knownParameters,
    missingParameters,
    needsEngineer,
  });

  const requirementSheet = input.rules.requiredQuoteFields.map((field) => ({
    field: FIELD_LABELS[field] ?? field,
    value: knownParameters[field] ?? null,
    required: true,
  }));

  return {
    summary,
    knownParameters,
    missingParameters,
    needsDrawing,
    needsEngineer,
    riskNotes,
    suggestedReply,
    requirementSheet,
  };
}

function buildSuggestedReply(input: {
  knownParameters: Record<string, string>;
  missingParameters: string[];
  needsEngineer: boolean;
}): string {
  const knownLines = Object.entries(input.knownParameters)
    .map(([key, value]) => `${FIELD_LABELS[key] ?? key}：${value}`)
    .join("\n");

  const missingLine =
    input.missingParameters.length > 0
      ? `为了给出准确方案，还需要您补充：${input.missingParameters.join("、")}。`
      : "目前参数较完整，我们将安排同事进一步确认。";

  const engineerLine = input.needsEngineer
    ? "该需求可能涉及非标或工程确认，我会同步工程师评估后再给您正式回复。"
    : "";

  return [
    "您好，已收到您的咨询。",
    knownLines ? `目前已了解：\n${knownLines}` : "",
    missingLine,
    engineerLine,
    "以上信息仅供参考，最终方案、价格与交期以工程师确认和正式报价为准。",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildRequirementSheetMarkdown(
  result: SalesAssistantAnalyzeResult,
): string {
  const lines = [
    "# 报价前需求确认单",
    "",
    "## 需求摘要",
    result.summary,
    "",
    "## 已知参数",
    ...Object.entries(result.knownParameters).map(
      ([key, value]) => `- ${FIELD_LABELS[key] ?? key}：${value}`,
    ),
    "",
    "## 待补充参数",
    ...(result.missingParameters.length > 0
      ? result.missingParameters.map((item) => `- ${item}`)
      : ["- 无"]),
    "",
    "## 风险提示",
    ...(result.riskNotes.length > 0 ? result.riskNotes.map((item) => `- ${item}`) : ["- 无"]),
    "",
    "> 本确认单由 AI 辅助生成，仅供内部流转；对外报价须人工审核。",
  ];
  return lines.join("\n");
}
