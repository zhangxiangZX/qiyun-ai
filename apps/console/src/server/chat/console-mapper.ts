import { getConversationMeta } from "@/server/chat/conversation-meta";
import type { ChatRepository } from "@/server/chat/chat.repository";
import type { ConversationDetail, ConversationSummary } from "@/server/chat/chat.types";
import type { RagRepository } from "@/server/rag/rag.repository";

export interface ConsoleConversationListItem {
  id: string;
  visitorLabel: string;
  summary: string;
  botId: string;
  botName: string;
  status: "open" | "resolved" | "unresolved" | "pending";
  hasLead: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface ConsoleConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  citations?: Array<{ id: string; title: string; excerpt: string }>;
}

export interface ConsoleConversationDetail extends ConsoleConversationListItem {
  visitorId: string;
  tags: string[];
  assignee: string | null;
  messages: ConsoleConversationMessage[];
  lead: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    capturedAt: string;
  } | null;
  channel: string;
  pageUrl: string;
}

function visitorLabel(visitorId: string): string {
  return `访客 #${visitorId.slice(-4)}`;
}

function deriveStatus(
  messages: Array<{ role: string; content: string }>,
  metaStatus: "open" | "resolved" | "unresolved" | "pending" | undefined,
): ConsoleConversationListItem["status"] {
  if (metaStatus) return metaStatus;
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  if (lastAssistant?.content.includes("没有足够信息")) {
    return "unresolved";
  }
  return "open";
}

export async function mapConversationSummary(
  summary: ConversationSummary,
  chatRepository: ChatRepository,
  ragRepository: RagRepository,
): Promise<ConsoleConversationListItem> {
  const bot = ragRepository.findBotById(summary.botId);
  const messages = await chatRepository.listMessagesByConversation(summary.id);
  const lastMessage = messages.at(-1);
  const lead = await chatRepository.findLeadByConversation(summary.id);
  const meta = getConversationMeta(summary.id);

  return {
    id: summary.id,
    visitorLabel: visitorLabel(summary.visitorId),
    summary: summary.lastMessagePreview ?? "新会话",
    botId: summary.botId,
    botName: bot?.name ?? summary.botId,
    status: deriveStatus(messages, meta?.status),
    hasLead: Boolean(lead),
    updatedAt: lastMessage?.createdAt ?? summary.createdAt,
    createdAt: summary.createdAt,
  };
}

export async function mapConversationDetail(
  detail: ConversationDetail,
  chatRepository: ChatRepository,
  ragRepository: RagRepository,
  citationsByMessageId: Record<string, Array<{ title: string; snippet: string }>> = {},
): Promise<ConsoleConversationDetail> {
  const listItem = await mapConversationSummary(detail, chatRepository, ragRepository);
  const meta = getConversationMeta(detail.id);
  const lead = await chatRepository.findLeadByConversation(detail.id);

  return {
    ...listItem,
    status: meta?.status ?? listItem.status,
    tags: meta?.tags ?? [],
    assignee: meta?.assignee ?? null,
    visitorId: detail.visitorId,
    channel: "官网 Widget",
    pageUrl: detail.origin,
    lead: lead
      ? {
          name: lead.fields.name ?? "访客",
          phone: lead.fields.phone,
          email: lead.fields.email,
          company: lead.fields.company,
          capturedAt: lead.createdAt,
        }
      : null,
    messages: detail.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      citations: (citationsByMessageId[message.id] ?? []).map((item, index) => ({
        id: `${message.id}-citation-${index}`,
        title: item.title,
        excerpt: item.snippet,
      })),
    })),
  };
}
