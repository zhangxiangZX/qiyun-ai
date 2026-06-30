import type {
  ConversationRecord,
  MessageRecord,
  SiteRecord,
} from "./chat.types";

export interface ChatRepository {
  createSite(record: SiteRecord): SiteRecord;
  findSiteByKey(siteKey: string): SiteRecord | null;
  createConversation(record: ConversationRecord): ConversationRecord;
  findConversationById(id: string): ConversationRecord | null;
  createMessage(record: MessageRecord): MessageRecord;
  listMessagesByConversation(conversationId: string): MessageRecord[];
}

export class InMemoryChatRepository implements ChatRepository {
  private readonly sites = new Map<string, SiteRecord>();
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, MessageRecord>();

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

  createMessage(record: MessageRecord): MessageRecord {
    this.messages.set(record.id, record);
    return record;
  }

  listMessagesByConversation(conversationId: string): MessageRecord[] {
    return [...this.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}
