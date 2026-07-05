import type { OpenAICompatibleChatClient } from "../llm/llm-chat";
import type { ConsultationIntent, ProductLine } from "./follow-up-suggestions";

export interface IntentJudgeResult {
  intent: ConsultationIntent;
  productLine: ProductLine;
  confidence: number;
  missingFields: string[];
  leadCaptureRecommended: boolean;
}

function stripCodeFences(input: string): string {
  return input
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

function normalizeIntent(value: unknown): ConsultationIntent {
  switch (value) {
    case "selection":
    case "parameters":
    case "quote":
    case "delivery":
    case "customization":
      return value;
    default:
      return "general";
  }
}

function normalizeProductLine(value: unknown): ProductLine {
  switch (value) {
    case "temperature-control":
    case "cabinet":
    case "console":
    case "suspension":
    case "accessory":
      return value;
    default:
      return "general";
  }
}

export async function judgeIntentWithLlm(
  llmChat: OpenAICompatibleChatClient | null,
  input: { message: string },
): Promise<IntentJudgeResult | null> {
  if (!llmChat) {
    return null;
  }

  const prompt = [
    "你是工业售前咨询意图识别器。",
    "请根据用户问题输出 JSON，不要输出任何额外解释。",
    "字段要求：",
    '- "intent": selection | parameters | quote | delivery | customization | general',
    '- "productLine": temperature-control | cabinet | console | suspension | accessory | general',
    '- "confidence": 0 到 1 的数字',
    '- "missingFields": 字符串数组，例如 ["尺寸","数量","使用环境","图纸"]',
    '- "leadCaptureRecommended": 布尔值',
    "规则：",
    "1. 报价、交期、采购、项目推进、图纸评估、非标定制，优先判为高意向。",
    "2. 表达模糊时，结合工业售前语境判断最可能的业务意图。",
    "3. 如果无法确定产品线，返回 general。",
    "4. 只返回合法 JSON。",
    `用户问题：${input.message}`,
  ].join("\n");

  try {
    const text = await llmChat.completeText({
      messages: [{ role: "system", content: prompt }],
      temperature: 0,
      maxTokens: 220,
    });
    const parsed = JSON.parse(stripCodeFences(text)) as {
      intent?: unknown;
      productLine?: unknown;
      confidence?: unknown;
      missingFields?: unknown;
      leadCaptureRecommended?: unknown;
    };

    return {
      intent: normalizeIntent(parsed.intent),
      productLine: normalizeProductLine(parsed.productLine),
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      missingFields: Array.isArray(parsed.missingFields)
        ? parsed.missingFields
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 6)
        : [],
      leadCaptureRecommended: Boolean(parsed.leadCaptureRecommended),
    };
  } catch {
    return null;
  }
}
