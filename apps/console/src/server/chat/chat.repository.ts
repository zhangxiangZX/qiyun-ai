import type {
  ConversationRecord,
  LeadRecord,
  MessageRecord,
  SiteRecord,
} from "./chat.types";

export interface ChatRepository {
  createSite(record: SiteRecord): Promise<SiteRecord>;
  findSiteByKey(siteKey: string): Promise<SiteRecord | null>;
  findSiteByBotId(workspaceId: string, botId: string): Promise<SiteRecord | null>;
  createConversation(record: ConversationRecord): Promise<ConversationRecord>;
  findConversationById(id: string): Promise<ConversationRecord | null>;
  listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]>;
  listConversationsPage(
    workspaceId: string,
    input: { limit: number; cursor?: string },
  ): Promise<{ items: ConversationRecord[]; nextCursor: string | null }>;
  createMessage(record: MessageRecord): Promise<MessageRecord>;
  listMessagesByConversation(conversationId: string): Promise<MessageRecord[]>;
  createLead(record: LeadRecord): Promise<LeadRecord>;
  listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]>;
  findLeadByConversation(conversationId: string): Promise<LeadRecord | null>;
}

export class InMemoryChatRepository implements ChatRepository {
  private readonly sites = new Map<string, SiteRecord>();
  private readonly sitesByBot = new Map<string, SiteRecord>();
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, MessageRecord>();
  private readonly leads = new Map<string, LeadRecord>();

  async createSite(record: SiteRecord): Promise<SiteRecord> {
    this.sites.set(record.siteKey, record);
    this.sitesByBot.set(`${record.workspaceId}:${record.botId}`, record);
    return record;
  }

  async findSiteByKey(siteKey: string): Promise<SiteRecord | null> {
    return this.sites.get(siteKey) ?? null;
  }

  async findSiteByBotId(workspaceId: string, botId: string): Promise<SiteRecord | null> {
    return this.sitesByBot.get(`${workspaceId}:${botId}`) ?? null;
  }

  async createConversation(record: ConversationRecord): Promise<ConversationRecord> {
    this.conversations.set(record.id, record);
    return record;
  }

  async findConversationById(id: string): Promise<ConversationRecord | null> {
    return this.conversations.get(id) ?? null;
  }

  async listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]> {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.workspaceId === workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async listConversationsPage(
    workspaceId: string,
    input: { limit: number; cursor?: string },
  ): Promise<{ items: ConversationRecord[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(input.limit, 1), 100);
    const sorted = await this.listConversationsByWorkspace(workspaceId);
    let startIndex = 0;

    if (input.cursor) {
      const cursorIndex = sorted.findIndex((item) => item.id === input.cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const slice = sorted.slice(startIndex, startIndex + limit + 1);
    const items = slice.slice(0, limit);
    const nextCursor = slice.length > limit ? (items.at(-1)?.id ?? null) : null;
    return { items, nextCursor };
  }

  async createMessage(record: MessageRecord): Promise<MessageRecord> {
    this.messages.set(record.id, record);
    return record;
  }

  async listMessagesByConversation(conversationId: string): Promise<MessageRecord[]> {
    return [...this.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async createLead(record: LeadRecord): Promise<LeadRecord> {
    this.leads.set(record.id, record);
    return record;
  }

  async listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]> {
    return [...this.leads.values()]
      .filter((lead) => lead.workspaceId === workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findLeadByConversation(conversationId: string): Promise<LeadRecord | null> {
    return (
      [...this.leads.values()].find((lead) => lead.conversationId === conversationId) ?? null
    );
  }
}
