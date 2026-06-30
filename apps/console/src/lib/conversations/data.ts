import { apiRequest } from "@/lib/api/client";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  fetchConversationDetail,
  fetchConversations,
  getBotFilterOptions,
} from "@/lib/conversations/mock-data";
import {
  applyClientFilters,
  mapConversationDetail,
  mapConversationSummary,
  type ApiConversationDetail,
} from "@/lib/conversations/map-api";
import type {
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  ConversationStatus,
} from "@/lib/conversations/types";

export async function listConversations(
  filters: ConversationFilters,
): Promise<ConversationListItem[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return fetchConversations(filters);
  }

  const summaries = await apiRequest<
    Array<{
      id: string;
      workspaceId: string;
      botId: string;
      visitorId: string;
      origin: string;
      createdAt: string;
      lastMessagePreview: string | null;
      messageCount: number;
    }>
  >("/conversations");

  return applyClientFilters(summaries.map(mapConversationSummary), filters);
}

export async function getConversationDetail(id: string): Promise<ConversationDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    const detail = await fetchConversationDetail(id);
    if (!detail) throw new Error("Conversation not found");
    return detail;
  }

  const detail = await apiRequest<ApiConversationDetail>(`/conversations/${id}`);
  return mapConversationDetail(detail);
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<ConversationDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    throw new Error("Preview mode: conversation metadata cannot be saved.");
  }

  return apiRequest<ConversationDetail>(`/conversations/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export async function updateConversationTags(
  id: string,
  tags: string[],
): Promise<ConversationDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    throw new Error("Preview mode: conversation metadata cannot be saved.");
  }

  return apiRequest<ConversationDetail>(`/conversations/${id}`, {
    method: "PATCH",
    body: { tags },
  });
}

export async function listBotFilterOptions(): Promise<Array<{ id: string; name: string }>> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return getBotFilterOptions();
  }

  const items = await listConversations({
    query: "",
    botId: "all",
    hasLead: null,
    unresolvedOnly: false,
  });

  const unique = new Map<string, string>();
  for (const item of items) {
    unique.set(item.botId, item.botName);
  }

  return [...unique.entries()].map(([id, name]) => ({ id, name }));
}

