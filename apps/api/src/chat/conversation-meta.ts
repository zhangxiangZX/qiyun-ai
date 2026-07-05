export interface ConversationMetaRecord {
  status?: "open" | "resolved" | "unresolved" | "pending";
  tags?: string[];
  assignee?: string | null;
}

const metaStore = new Map<string, ConversationMetaRecord>();

export function getConversationMeta(
  conversationId: string,
): ConversationMetaRecord | null {
  return metaStore.get(conversationId) ?? null;
}

export function upsertConversationMeta(
  conversationId: string,
  patch: ConversationMetaRecord,
): ConversationMetaRecord {
  const current = metaStore.get(conversationId) ?? {};
  const next = { ...current, ...patch };
  metaStore.set(conversationId, next);
  return next;
}
