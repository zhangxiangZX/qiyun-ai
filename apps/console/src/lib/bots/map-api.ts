import { WIDGET_ASSET_VERSION } from "@/generated/widget-version";
import type { BotDetail, BotListItem, BotStatus } from "@/lib/bots/types";

export interface ApiBot {
  id: string;
  workspaceId: string;
  name: string;
  status: "draft" | "active" | "disabled";
  knowledgeBaseIds: string[];
  description?: string;
  welcomeMessage?: string;
  recommendedQuestions?: string[];
  systemPrompt?: string;
  collectLeadsOnFailure?: boolean;
  rateLimitPerMinute?: number;
  allowedDomains?: string[];
  leadFields?: string[];
  llmTemperature?: number;
  maxOutputTokens?: number;
  conversations7d?: number;
  updatedAt?: string;
}

function mapStatus(status: ApiBot["status"]): BotStatus {
  if (status === "active") return "enabled";
  return status;
}

function toApiStatus(status: BotStatus): ApiBot["status"] {
  if (status === "enabled") return "active";
  return status;
}

function buildEmbedSnippet(botId: string): string {
  const base = process.env.NEXT_PUBLIC_WIDGET_URL?.replace(/\/$/, "") || "https://cdn.qiyuntu.cn";
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://api.qiyuntu.cn";
  const version = process.env.NEXT_PUBLIC_WIDGET_ASSET_VERSION?.trim() || WIDGET_ASSET_VERSION;
  const src = base
    ? `${base}/public/widget.js?v=${version}`
    : `https://cdn.qiyuntu.cn/public/widget.js?v=${version}`;
  return `<script src="${src}" data-api-base="${apiBase}" data-bot-id="${botId}" async></script>`;
}

export function mapBotListItem(bot: ApiBot): BotListItem {
  return {
    id: bot.id,
    name: bot.name,
    status: mapStatus(bot.status),
    knowledgeBaseCount: bot.knowledgeBaseIds.length,
    conversations7d: bot.conversations7d ?? 0,
    updatedAt: bot.updatedAt ?? new Date().toISOString(),
  };
}

export function mapBotDetail(bot: ApiBot): BotDetail {
  const list = mapBotListItem(bot);
  return {
    ...list,
    description: bot.description ?? "",
    welcomeMessage: bot.welcomeMessage ?? "你好，有什么可以帮你？",
    recommendedQuestions: bot.recommendedQuestions ?? [],
    systemPrompt: bot.systemPrompt ?? "你是专业、友好的企业客服助手。",
    knowledgeBaseIds: [...bot.knowledgeBaseIds],
    collectLeadsOnFailure: bot.collectLeadsOnFailure ?? true,
    rateLimitPerMinute: bot.rateLimitPerMinute ?? 30,
    allowedDomains: bot.allowedDomains ?? [],
    leadFields: bot.leadFields ?? ["name", "phone"],
    llmTemperature: bot.llmTemperature ?? 0.3,
    maxOutputTokens: bot.maxOutputTokens ?? 1024,
    embedSnippet: buildEmbedSnippet(bot.id),
  };
}

export function toApiBotPatch(patch: Partial<BotDetail>): Partial<ApiBot> {
  const apiPatch: Partial<ApiBot> = {};

  if (patch.name !== undefined) apiPatch.name = patch.name;
  if (patch.status !== undefined) apiPatch.status = toApiStatus(patch.status);
  if (patch.knowledgeBaseIds !== undefined) apiPatch.knowledgeBaseIds = patch.knowledgeBaseIds;
  if (patch.description !== undefined) apiPatch.description = patch.description;
  if (patch.welcomeMessage !== undefined) apiPatch.welcomeMessage = patch.welcomeMessage;
  if (patch.recommendedQuestions !== undefined) {
    apiPatch.recommendedQuestions = patch.recommendedQuestions;
  }
  if (patch.systemPrompt !== undefined) apiPatch.systemPrompt = patch.systemPrompt;
  if (patch.collectLeadsOnFailure !== undefined) {
    apiPatch.collectLeadsOnFailure = patch.collectLeadsOnFailure;
  }
  if (patch.rateLimitPerMinute !== undefined) apiPatch.rateLimitPerMinute = patch.rateLimitPerMinute;
  if (patch.allowedDomains !== undefined) apiPatch.allowedDomains = patch.allowedDomains;
  if (patch.leadFields !== undefined) apiPatch.leadFields = patch.leadFields;
  if (patch.llmTemperature !== undefined) apiPatch.llmTemperature = patch.llmTemperature;
  if (patch.maxOutputTokens !== undefined) apiPatch.maxOutputTokens = patch.maxOutputTokens;

  return apiPatch;
}

export function toApiCreateBody(name: string): { name: string; status: "draft" } {
  return { name, status: "draft" };
}
