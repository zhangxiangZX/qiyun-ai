import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { createBotOnApi, getBotFromApi, listBotsFromApi, updateBotOnApi } from "@/lib/bots/api";
import {
  fetchBotDetail,
  fetchBots,
  getKnowledgeBaseOptions,
} from "@/lib/bots/mock-data";
import type { BotDetail, BotListItem, KnowledgeBaseOption } from "@/lib/bots/types";

export const BOTS_API_AVAILABLE = true;

export async function canPersistBots(): Promise<boolean> {
  const mode = await fetchConsoleMode();
  return !isPreviewMode(mode) && BOTS_API_AVAILABLE;
}

export async function listBots(): Promise<BotListItem[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !BOTS_API_AVAILABLE) {
    return fetchBots();
  }
  return listBotsFromApi();
}

export async function getBotDetail(botId: string): Promise<BotDetail | null> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !BOTS_API_AVAILABLE) {
    return fetchBotDetail(botId);
  }
  return getBotFromApi(botId);
}

export async function createBot(name: string): Promise<BotDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !BOTS_API_AVAILABLE) {
    if (isPreviewMode(mode)) {
      throw new Error("Preview mode: bots cannot be created until upstream persistence is enabled.");
    }
    throw new Error("Bots create API is not available yet.");
  }
  return createBotOnApi(name);
}

export async function saveBot(bot: BotDetail): Promise<BotDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !BOTS_API_AVAILABLE) {
    if (isPreviewMode(mode)) {
      throw new Error("Preview mode: bot changes cannot be saved until upstream persistence is enabled.");
    }
    throw new Error("Bots save API is not available yet.");
  }
  return updateBotOnApi(bot.id, bot);
}

export async function loadKnowledgeBaseOptions(): Promise<KnowledgeBaseOption[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return getKnowledgeBaseOptions();
  }

  const { listKnowledgeBases } = await import("@/lib/knowledge/api");
  const bases = await listKnowledgeBases();
  return bases.map((base) => ({ id: base.id, name: base.name }));
}
