import type { ConversationMetaRecord } from "./chat.repository";

export interface ConversationListQuery {
  limit: number;
  cursor?: string;
  botId?: string;
  status?: NonNullable<ConversationMetaRecord["status"]>;
  hasLead?: boolean;
  q?: string;
  qBotIds?: string[];
}

export function parseConversationListQuery(
  searchParams: URLSearchParams,
  limitFallback = 0,
): ConversationListQuery | undefined {
  const limitRaw = Number(searchParams.get("limit") ?? String(limitFallback));
  const limit = limitRaw > 0 ? limitRaw : limitFallback;
  const cursor = searchParams.get("cursor")?.trim() || undefined;
  const botId = searchParams.get("botId")?.trim() || undefined;
  const statusRaw = searchParams.get("status")?.trim();
  const status =
    statusRaw === "open"
    || statusRaw === "resolved"
    || statusRaw === "unresolved"
    || statusRaw === "pending"
      ? statusRaw
      : undefined;
  const hasLeadRaw = searchParams.get("hasLead")?.trim();
  const hasLead =
    hasLeadRaw === "true" ? true : hasLeadRaw === "false" ? false : undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  if (limit <= 0 && !botId && !status && hasLead === undefined && !q) {
    return undefined;
  }

  return {
    limit: limit > 0 ? limit : 20,
    cursor,
    botId,
    status,
    hasLead,
    q,
  };
}
