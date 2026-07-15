import { apiRequest } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import type { ApiBot } from "@/lib/bots/map-api";
import { mapBotDetail, mapBotListItem, toApiBotPatch, toApiCreateBody } from "@/lib/bots/map-api";
import type { BotDetail, BotListItem } from "@/lib/bots/types";

export async function listBotsFromApi(): Promise<BotListItem[]> {
  const bots = await apiRequest<ApiBot[]>("/bots");
  return bots.map(mapBotListItem);
}

export async function getBotFromApi(id: string): Promise<BotDetail | null> {
  try {
    const bot = await apiRequest<ApiBot>(`/bots/${id}`);
    return mapBotDetail(bot);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      const bots = await apiRequest<ApiBot[]>("/bots");
      const bot = bots.find((item) => item.id === id);
      return bot ? mapBotDetail(bot) : null;
    }

    throw error;
  }
}

export async function createBotOnApi(name: string): Promise<BotDetail> {
  const bot = await apiRequest<ApiBot>("/bots", {
    method: "POST",
    body: toApiCreateBody(name),
  });
  return mapBotDetail(bot);
}

export async function updateBotOnApi(id: string, patch: Partial<BotDetail>): Promise<BotDetail> {
  const bot = await apiRequest<ApiBot>(`/bots/${id}`, {
    method: "PATCH",
    body: toApiBotPatch(patch),
  });
  return mapBotDetail(bot);
}
