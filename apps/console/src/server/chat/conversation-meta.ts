export type ConversationConsoleStatus = "open" | "resolved" | "unresolved" | "pending";

export interface ConversationMeta {
  status: ConversationConsoleStatus;
  tags: string[];
  assignee: string | null;
}

const metaByConversationId = new Map<string, ConversationMeta>();

export function getConversationMeta(conversationId: string): ConversationMeta | null {
  return metaByConversationId.get(conversationId) ?? null;
}

export function upsertConversationMeta(
  conversationId: string,
  patch: Partial<ConversationMeta>,
): ConversationMeta {
  const current = metaByConversationId.get(conversationId) ?? {
    status: "open",
    tags: [],
    assignee: null,
  };
  const next = { ...current, ...patch };
  metaByConversationId.set(conversationId, next);
  return next;
}
