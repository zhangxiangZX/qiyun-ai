import { randomUUID } from "node:crypto";

import type { RagService } from "../rag/rag.service";
import type { BotRecord, RagCitation } from "../rag/rag.types";
import type { RagRepository } from "../rag/rag.repository";
import type { ChatRepository } from "./chat.repository";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ConversationRecord,
  MessageRecord,
  SiteRecord,
} from "./chat.types";

export class ChatAccessError extends Error {}
export class ChatValidationError extends Error {}

function splitIntoTokens(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed.split(/(\s+)/).filter(Boolean);
}

function originAllowed(origin: string, allowedDomains: string[]): boolean {
  return allowedDomains.some((domain) => origin.toLowerCase().includes(domain.toLowerCase()));
}

function buildAssistantReply(citations: RagCitation[], needsLeadCapture: boolean): string {
  if (citations.length === 0 || needsLeadCapture) {
    return "目前资料里没有足够信息，我可以先记录您的需求并安排人工跟进。";
  }

  const primary = citations[0];
  return `根据 ${primary?.title}，${primary?.snippet ?? "我已找到相关资料。"}`
}

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly ragRepository: RagRepository,
    private readonly ragService: RagService,
  ) {}

  createSite(input: {
    workspaceId: string;
    botId: string;
    name: string;
    siteKey?: string;
    allowedDomains: string[];
    status?: SiteRecord["status"];
  }): SiteRecord {
    const bot = this.requireBot(input.workspaceId, input.botId);

    return this.repository.createSite({
      id: `site_${randomUUID()}`,
      workspaceId: input.workspaceId,
      botId: bot.id,
      name: input.name.trim(),
      siteKey: input.siteKey ?? `pk_${randomUUID()}`,
      allowedDomains: input.allowedDomains,
      status: input.status ?? "active",
    });
  }

  stream(request: ChatStreamRequest): {
    conversation: ConversationRecord;
    userMessage: MessageRecord;
    assistantMessage: MessageRecord;
    events: ChatStreamEvent[];
  } {
    const site = this.requireSite(request.siteKey);
    const bot = this.requireBot(site.workspaceId, request.botId);

    if (site.botId !== bot.id) {
      throw new ChatAccessError("Site does not belong to bot.");
    }

    if (!originAllowed(request.origin, site.allowedDomains)) {
      throw new ChatAccessError("Origin is not allowed for this site.");
    }

    if (!request.message.trim()) {
      throw new ChatValidationError("Message is required.");
    }

    const conversation = this.resolveConversation(site.workspaceId, bot.id, request);
    const now = new Date().toISOString();
    const userMessage = this.repository.createMessage({
      id: `msg_${randomUUID()}`,
      conversationId: conversation.id,
      role: "user",
      content: request.message.trim(),
      createdAt: now,
    });

    const retrieval = this.ragService.search({
      workspaceId: site.workspaceId,
      botId: bot.id,
      query: request.message,
    });

    const assistantReply = buildAssistantReply(
      retrieval.citations,
      retrieval.needsLeadCapture,
    );
    const assistantMessage = this.repository.createMessage({
      id: `msg_${randomUUID()}`,
      conversationId: conversation.id,
      role: "assistant",
      content: assistantReply,
      createdAt: new Date().toISOString(),
    });

    const events: ChatStreamEvent[] = [
      {
        event: "meta",
        data: {
          conversationId: conversation.id,
        },
      },
      ...splitIntoTokens(assistantReply).map((token) => ({
        event: "token" as const,
        data: { text: token },
      })),
      {
        event: "citations",
        data: {
          items: retrieval.citations,
        },
      },
      {
        event: "done",
        data: {
          needsLeadCapture: retrieval.needsLeadCapture,
          messageId: assistantMessage.id,
        },
      },
    ];

    return {
      conversation,
      userMessage,
      assistantMessage,
      events,
    };
  }

  private resolveConversation(
    workspaceId: string,
    botId: string,
    request: ChatStreamRequest,
  ): ConversationRecord {
    if (request.conversationId) {
      const existing = this.repository.findConversationById(request.conversationId);
      if (
        existing &&
        existing.workspaceId === workspaceId &&
        existing.botId === botId
      ) {
        return existing;
      }

      throw new ChatAccessError("Conversation not found in workspace.");
    }

    return this.repository.createConversation({
      id: `conv_${randomUUID()}`,
      workspaceId,
      botId,
      visitorId: request.visitorId,
      origin: request.origin,
      createdAt: new Date().toISOString(),
    });
  }

  private requireSite(siteKey: string): SiteRecord {
    const site = this.repository.findSiteByKey(siteKey);

    if (!site || site.status !== "active") {
      throw new ChatAccessError("Site not found or inactive.");
    }

    return site;
  }

  private requireBot(workspaceId: string, botId: string): BotRecord {
    const bot = this.ragRepository.findBotById(botId);

    if (!bot || bot.workspaceId !== workspaceId || bot.status !== "active") {
      throw new ChatAccessError("Bot not found or inactive.");
    }

    return bot;
  }
}
