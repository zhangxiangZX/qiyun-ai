import type {
  ConversationRecord,
  LeadRecord,
  MessageRecord,
  SiteRecord,
} from "./chat.types";

export interface ChatRepository {
  createSite(record: SiteRecord): SiteRecord;
  findSiteByKey(siteKey: string): SiteRecord | null;
  createConversation(record: ConversationRecord): ConversationRecord;
  findConversationById(id: string): ConversationRecord | null;
  listConversationsByWorkspace(workspaceId: string): ConversationRecord[];
  createMessage(record: MessageRecord): MessageRecord;
  listMessagesByConversation(conversationId: string): MessageRecord[];
  createLead(record: LeadRecord): LeadRecord;
  listLeadsByWorkspace(workspaceId: string): LeadRecord[];
}

export class InMemoryChatRepository implements ChatRepository {
  private readonly sites = new Map<string, SiteRecord>();
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, MessageRecord>();
  private readonly leads = new Map<string, LeadRecord>();

  createSite(record: SiteRecord): SiteRecord {
    this.sites.set(record.siteKey, record);
    return record;
  }

  findSiteByKey(siteKey: string): SiteRecord | null {
    return this.sites.get(siteKey) ?? null;
  }

  createConversation(record: ConversationRecord): ConversationRecord {
    this.conversations.set(record.id, record);
    return record;
  }

  findConversationById(id: string): ConversationRecord | null {
    return this.conversations.get(id) ?? null;
  }

  listConversationsByWorkspace(workspaceId: string): ConversationRecord[] {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.workspaceId === workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createMessage(record: MessageRecord): MessageRecord {
    this.messages.set(record.id, record);
    return record;
  }

  listMessagesByConversation(conversationId: string): MessageRecord[] {
    return [...this.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createLead(record: LeadRecord): LeadRecord {
    this.leads.set(record.id, record);
    return record;
  }

  listLeadsByWorkspace(workspaceId: string): LeadRecord[] {
    return [...this.leads.values()]
      .filter((lead) => lead.workspaceId === workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
