import { apiRequest } from "@/lib/api/client";
import type {
  ConversationDetail,
  ConversationFilters,
  ConversationPage,
  ConversationListItem,
  ConversationStatus,
} from "@/lib/conversations/types";

export function applyConversationFilters(
  items: ConversationListItem[],
  filters: ConversationFilters,
): ConversationListItem[] {
  let result = items;

  if (filters.query.trim()) {
    const query = filters.query.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.visitorLabel.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.botName.toLowerCase().includes(query),
    );
  }

  if (filters.botId !== "all") {
    result = result.filter((item) => item.botId === filters.botId);
  }

  if (filters.hasLead === true) {
    result = result.filter((item) => item.hasLead);
  }

  if (filters.unresolvedOnly) {
    result = result.filter((item) => item.status === "unresolved");
  }

  return result.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function listAllConversations(): Promise<ConversationListItem[]> {
  const result = await apiRequest<
    ConversationListItem[] | { items: ConversationListItem[]; nextCursor?: string | null }
  >("/conversations");
  return Array.isArray(result) ? result : result.items;
}

export async function listConversationsPage(input?: {
  limit?: number;
  cursor?: string | null;
  filters?: ConversationFilters;
  serverFilters?: boolean;
}): Promise<ConversationPage> {
  const searchParams = new URLSearchParams();
  if (input?.limit) {
    searchParams.set("limit", String(input.limit));
  }
  if (input?.cursor) {
    searchParams.set("cursor", input.cursor);
  }
  if (input?.serverFilters && input.filters) {
    if (input.filters.query.trim()) {
      searchParams.set("q", input.filters.query.trim());
    }
    if (input.filters.botId !== "all") {
      searchParams.set("botId", input.filters.botId);
    }
    if (input.filters.hasLead === true) {
      searchParams.set("hasLead", "true");
    }
    if (input.filters.unresolvedOnly) {
      searchParams.set("status", "unresolved");
    }
  }

  const query = searchParams.toString();
  const result = await apiRequest<
    ConversationListItem[] | { items: ConversationListItem[]; nextCursor?: string | null }
  >(`/conversations${query ? `?${query}` : ""}`);

  if (Array.isArray(result)) {
    return { items: result, nextCursor: null };
  }

  return {
    items: result.items,
    nextCursor: result.nextCursor ?? null,
  };
}

export async function listConversations(
  filters: ConversationFilters,
): Promise<ConversationListItem[]> {
  const items = await listAllConversations();
  return applyConversationFilters(items, filters);
}

export async function getConversationDetail(id: string): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>(`/conversations/${id}`);
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>(`/conversations/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export async function updateConversationTags(
  id: string,
  tags: string[],
): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>(`/conversations/${id}`, {
    method: "PATCH",
    body: { tags },
  });
}

export async function listBotFilterOptions(): Promise<Array<{ id: string; name: string }>> {
  const bots = await apiRequest<Array<{ id: string; name: string }>>("/bots");
  return bots.map((bot) => ({ id: bot.id, name: bot.name }));
}
