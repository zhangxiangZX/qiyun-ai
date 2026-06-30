import type {
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  ConversationStatus,
} from "./types";

interface ApiMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ApiConversationSummary {
  id: string;
  workspaceId: string;
  botId: string;
  visitorId: string;
  origin: string;
  createdAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
}

export interface ApiConversationDetail extends ApiConversationSummary {
  messages: ApiMessageRecord[];
}

function visitorLabel(visitorId: string): string {
  const suffix = visitorId.length > 4 ? visitorId.slice(-4) : visitorId;
  return `访客 #${suffix}`;
}

function deriveStatus(messages: ApiMessageRecord[]): ConversationStatus {
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  if (lastAssistant?.content.includes("没有足够信息")) {
    return "unresolved";
  }
  if (messages.length === 0) return "open";
  return "open";
}

export function mapConversationSummary(summary: ApiConversationSummary): ConversationListItem {
  return {
    id: summary.id,
    visitorLabel: visitorLabel(summary.visitorId),
    summary: summary.lastMessagePreview ?? "新会话",
    botId: summary.botId,
    botName: summary.botId,
    status: "open",
    hasLead: false,
    updatedAt: summary.createdAt,
    createdAt: summary.createdAt,
  };
}

export function mapConversationDetail(detail: ApiConversationDetail): ConversationDetail {
  const status = deriveStatus(detail.messages);
  const lastMessage = detail.messages.at(-1);

  return {
    id: detail.id,
    visitorId: detail.visitorId,
    visitorLabel: visitorLabel(detail.visitorId),
    summary: detail.lastMessagePreview ?? "新会话",
    botId: detail.botId,
    botName: detail.botId,
    status,
    hasLead: false,
    updatedAt: lastMessage?.createdAt ?? detail.createdAt,
    createdAt: detail.createdAt,
    tags: [],
    assignee: null,
    channel: "官网 Widget",
    pageUrl: detail.origin,
    lead: null,
    messages: detail.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

export function applyClientFilters(
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
