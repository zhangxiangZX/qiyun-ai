import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  getConversationDetail as fetchConversationDetail,
  listBotFilterOptions as fetchBotFilterOptions,
  listConversations as fetchConversations,
  listConversationsPage as fetchConversationPage,
  updateConversationStatus as patchConversationStatus,
  updateConversationTags as patchConversationTags,
} from "@/lib/conversations/api";
import type {
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  ConversationPage,
  ConversationStatus,
} from "@/lib/conversations/types";

export {
  applyConversationFilters,
  listAllConversations,
} from "@/lib/conversations/api";

export const CONVERSATIONS_METADATA_PERSISTENT = true;

export async function listConversations(
  filters: ConversationFilters,
): Promise<ConversationListItem[]> {
  return fetchConversations(filters);
}

export async function listConversationsPage(input?: {
  limit?: number;
  cursor?: string | null;
  filters?: ConversationFilters;
  serverFilters?: boolean;
}): Promise<ConversationPage> {
  return fetchConversationPage(input);
}

export async function getConversationDetail(id: string): Promise<ConversationDetail> {
  return fetchConversationDetail(id);
}

export async function listBotFilterOptions(): Promise<Array<{ id: string; name: string }>> {
  return fetchBotFilterOptions();
}

export async function canPersistConversationMetadata(): Promise<boolean> {
  const mode = await fetchConsoleMode();
  return !isPreviewMode(mode) && CONVERSATIONS_METADATA_PERSISTENT;
}

export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<ConversationDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    throw new Error("Preview mode: conversation metadata cannot be saved.");
  }
  if (!CONVERSATIONS_METADATA_PERSISTENT) {
    throw new Error("Conversation metadata API is not available yet.");
  }
  return patchConversationStatus(id, status);
}

export async function updateConversationTags(
  id: string,
  tags: string[],
): Promise<ConversationDetail> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    throw new Error("Preview mode: conversation metadata cannot be saved.");
  }
  if (!CONVERSATIONS_METADATA_PERSISTENT) {
    throw new Error("Conversation metadata API is not available yet.");
  }
  return patchConversationTags(id, tags);
}
