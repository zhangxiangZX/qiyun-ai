import { randomUUID } from "node:crypto";

import type { RagService } from "@/server/rag/rag.service";
import type { BotRecord } from "@/server/rag/rag.types";
import type { RagRepository } from "@/server/rag/rag.repository";
import type { ChatRepository } from "./chat.repository";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ConversationDetail,
  ConversationRecord,
  ConversationSummary,
  LeadRecord,
  LeadSubmissionRequest,
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

function extractAllowedHostname(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(
      normalized.includes("://") ? normalized : `https://${normalized}`,
    );
    return parsed.hostname.toLowerCase();
  } catch {
    return normalized
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0]
      ?.trim() || null;
  }
}

function originAllowed(origin: string, allowedDomains: string[]): boolean {
  try {
    const originHostname = new URL(origin).hostname.toLowerCase();
    return allowedDomains.some((domain) => {
      const allowedHostname = extractAllowedHostname(domain);
      if (!allowedHostname) {
        return false;
      }

      return (
        originHostname === allowedHostname ||
        originHostname.endsWith(`.${allowedHostname}`)
      );
    });
  } catch {
    return false;
  }
}

function buildAssistantReply(citations: Array<{ title: string; snippet: string }>, needsLeadCapture: boolean): string {
  if (citations.length === 0 || needsLeadCapture) {
    return "目前资料里没有足够信息，我可以先记录您的需求并安排人工跟进。";
  }

  const primary = citations[0];
  return `根据 ${primary?.title}，${primary?.snippet ?? "我已找到相关资料。"}`;
}

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly ragRepository: RagRepository,
    private readonly ragService: RagService,
  ) {}

  async createSite(input: {
    workspaceId: string;
    botId: string;
    name: string;
    siteKey?: string;
    allowedDomains: string[];
    status?: SiteRecord["status"];
  }): Promise<SiteRecord> {
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

  async getPreviewSite(workspaceId: string, botId: string): Promise<SiteRecord | null> {
    return this.repository.findSiteByBotId(workspaceId, botId);
  }

  async stream(request: ChatStreamRequest): Promise<{
    conversation: ConversationRecord;
    userMessage: MessageRecord;
    assistantMessage: MessageRecord;
    events: ChatStreamEvent[];
  }> {
    const site = await this.requireSite(request.siteKey);
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

    const conversation = await this.resolveConversation(site.workspaceId, bot.id, request);
    const now = new Date().toISOString();
    const userMessage = await this.repository.createMessage({
      id: `msg_${randomUUID()}`,
      workspaceId: site.workspaceId,
      botId: bot.id,
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

    const assistantReply = buildAssistantReply(retrieval.citations, retrieval.needsLeadCapture);
    const assistantMessage = await this.repository.createMessage({
      id: `msg_${randomUUID()}`,
      workspaceId: site.workspaceId,
      botId: bot.id,
      conversationId: conversation.id,
      role: "assistant",
      content: assistantReply,
      createdAt: new Date().toISOString(),
    });

    const events: ChatStreamEvent[] = [
      {
        event: "meta",
        data: { conversationId: conversation.id },
      },
      ...splitIntoTokens(assistantReply).map((token) => ({
        event: "token" as const,
        data: { text: token },
      })),
      {
        event: "citations",
        data: { items: retrieval.citations },
      },
      {
        event: "done",
        data: {
          needsLeadCapture: retrieval.needsLeadCapture,
          messageId: assistantMessage.id,
        },
      },
    ];

    return { conversation, userMessage, assistantMessage, events };
  }

  async submitLead(request: LeadSubmissionRequest): Promise<LeadRecord> {
    const site = await this.requireSite(request.siteKey);
    const bot = this.requireBot(site.workspaceId, request.botId);

    if (site.botId !== bot.id) {
      throw new ChatAccessError("Site does not belong to bot.");
    }

    const conversation = await this.repository.findConversationById(request.conversationId);
    if (
      !conversation ||
      conversation.workspaceId !== site.workspaceId ||
      conversation.botId !== bot.id
    ) {
      throw new ChatAccessError("Conversation not found in workspace.");
    }

    const fields = Object.fromEntries(
      Object.entries(request.fields).filter(([, value]) => value.trim() !== ""),
    );

    if (Object.keys(fields).length === 0) {
      throw new ChatValidationError("At least one lead field is required.");
    }

    return this.repository.createLead({
      id: `lead_${randomUUID()}`,
      workspaceId: site.workspaceId,
      botId: bot.id,
      conversationId: conversation.id,
      siteKey: request.siteKey,
      fields,
      createdAt: new Date().toISOString(),
    });
  }

  async listConversations(
    workspaceId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
    const page = options?.limit
      ? await this.repository.listConversationsPage(workspaceId, {
          limit: options.limit,
          cursor: options.cursor,
        })
      : {
          items: await this.repository.listConversationsByWorkspace(workspaceId),
          nextCursor: null,
        };

    const output: ConversationSummary[] = [];

    for (const conversation of page.items) {
      const messages = await this.repository.listMessagesByConversation(conversation.id);
      const lastMessage = messages.at(-1) ?? null;

      output.push({
        ...conversation,
        lastMessagePreview: lastMessage?.content.slice(0, 80) ?? null,
        messageCount: messages.length,
      });
    }

    return { items: output, nextCursor: page.nextCursor };
  }

  async getConversation(workspaceId: string, conversationId: string): Promise<ConversationDetail> {
    const conversation = await this.repository.findConversationById(conversationId);

    if (!conversation || conversation.workspaceId !== workspaceId) {
      throw new ChatAccessError("Conversation not found in workspace.");
    }

    const messages = await this.repository.listMessagesByConversation(conversationId);
    const lastMessage = messages.at(-1) ?? null;

    return {
      ...conversation,
      lastMessagePreview: lastMessage?.content.slice(0, 80) ?? null,
      messageCount: messages.length,
      messages,
    };
  }

  private async resolveConversation(
    workspaceId: string,
    botId: string,
    request: ChatStreamRequest,
  ): Promise<ConversationRecord> {
    if (request.conversationId) {
      const existing = await this.repository.findConversationById(request.conversationId);
      if (existing && existing.workspaceId === workspaceId && existing.botId === botId) {
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

  private async requireSite(siteKey: string): Promise<SiteRecord> {
    const site = await this.repository.findSiteByKey(siteKey);

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
