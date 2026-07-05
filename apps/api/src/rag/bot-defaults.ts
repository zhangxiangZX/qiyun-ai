import type { BotRecord } from "./rag.types";
import { normalizeRecommendedQuestions } from "./recommended-questions";

export const DEFAULT_BOT_EXTENDED = {
  description: "",
  welcomeMessage: "你好，有什么可以帮你？",
  recommendedQuestions: [] as string[],
  systemPrompt: "你是专业、友好的企业客服助手。",
  collectLeadsOnFailure: true,
  rateLimitPerMinute: 30,
  allowedDomains: [] as string[],
  leadFields: ["name", "phone", "email", "company", "requirement", "productType", "quantity"] as string[],
  llmTemperature: 0.45,
  maxOutputTokens: 1024,
};

export function normalizeBotRecord(
  bot: Partial<BotRecord> & Pick<BotRecord, "id" | "workspaceId" | "name">,
): BotRecord {
  const now = new Date().toISOString();

  return {
    id: bot.id,
    workspaceId: bot.workspaceId,
    name: bot.name,
    status: bot.status ?? "active",
    knowledgeBaseIds: bot.knowledgeBaseIds ?? [],
    description: bot.description ?? DEFAULT_BOT_EXTENDED.description,
    welcomeMessage: bot.welcomeMessage ?? DEFAULT_BOT_EXTENDED.welcomeMessage,
    recommendedQuestions: normalizeRecommendedQuestions(
      bot.recommendedQuestions ?? DEFAULT_BOT_EXTENDED.recommendedQuestions,
    ),
    systemPrompt: bot.systemPrompt ?? DEFAULT_BOT_EXTENDED.systemPrompt,
    collectLeadsOnFailure:
      bot.collectLeadsOnFailure ?? DEFAULT_BOT_EXTENDED.collectLeadsOnFailure,
    rateLimitPerMinute:
      bot.rateLimitPerMinute ?? DEFAULT_BOT_EXTENDED.rateLimitPerMinute,
    allowedDomains: bot.allowedDomains ?? [...DEFAULT_BOT_EXTENDED.allowedDomains],
    leadFields: bot.leadFields ?? [...DEFAULT_BOT_EXTENDED.leadFields],
    llmTemperature: bot.llmTemperature ?? DEFAULT_BOT_EXTENDED.llmTemperature,
    maxOutputTokens: bot.maxOutputTokens ?? DEFAULT_BOT_EXTENDED.maxOutputTokens,
    updatedAt: bot.updatedAt ?? now,
  };
}
