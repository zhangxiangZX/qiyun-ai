import type { SqlClient } from "./chat.postgres.repository";
import { PostgresChatRepository } from "./chat.postgres.repository";
import type {
  ConversationRecord,
  LeadRecord,
  MessageRecord,
  SiteRecord,
} from "./chat.types";

export type ChatRepositoryMode = "memory" | "postgres";

export interface ChatRepository {
  createSite(record: SiteRecord): Promise<SiteRecord>;
  findSiteByKey(siteKey: string): Promise<SiteRecord | null>;
  createConversation(record: ConversationRecord): Promise<ConversationRecord>;
  findConversationById(id: string): Promise<ConversationRecord | null>;
  listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]>;
  createMessage(record: MessageRecord): Promise<MessageRecord>;
  listMessagesByConversation(conversationId: string): Promise<MessageRecord[]>;
  createLead(record: LeadRecord): Promise<LeadRecord>;
  listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]>;
}

export class InMemoryChatRepository implements ChatRepository {
  private readonly sites = new Map<string, SiteRecord>();
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, MessageRecord>();
  private readonly leads = new Map<string, LeadRecord>();

  async createSite(record: SiteRecord): Promise<SiteRecord> {
    this.sites.set(record.siteKey, record);
    return record;
  }

  async findSiteByKey(siteKey: string): Promise<SiteRecord | null> {
    return this.sites.get(siteKey) ?? null;
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
}

export class HybridPostgresChatRepository implements ChatRepository {
  private readonly sites = new Map<string, SiteRecord>();
  private readonly postgres: PostgresChatRepository;

  constructor(client: SqlClient) {
    this.postgres = new PostgresChatRepository(client);
  }

  async createSite(record: SiteRecord): Promise<SiteRecord> {
    this.sites.set(record.siteKey, record);
    return record;
  }

  async findSiteByKey(siteKey: string): Promise<SiteRecord | null> {
    return this.sites.get(siteKey) ?? null;
  }

  async createConversation(record: ConversationRecord): Promise<ConversationRecord> {
    return this.postgres.createConversation(record);
  }

  async findConversationById(id: string): Promise<ConversationRecord | null> {
    return this.postgres.findConversationById(id);
  }

  async listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]> {
    return this.postgres.listConversationsByWorkspace(workspaceId);
  }

  async createMessage(record: MessageRecord): Promise<MessageRecord> {
    return this.postgres.createMessage(record);
  }

  async listMessagesByConversation(conversationId: string): Promise<MessageRecord[]> {
    return this.postgres.listMessagesByConversation(conversationId);
  }

  async createLead(record: LeadRecord): Promise<LeadRecord> {
    return this.postgres.createLead(record);
  }

  async listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]> {
    return this.postgres.listLeadsByWorkspace(workspaceId);
  }
}

export function createChatRepository(input?: {
  mode?: ChatRepositoryMode;
  sqlClient?: SqlClient;
}): ChatRepository {
  const mode = input?.mode ?? "memory";

  if (mode === "postgres") {
    if (!input?.sqlClient) {
      throw new Error("Postgres chat repository mode requires a sqlClient.");
    }

    return new HybridPostgresChatRepository(input.sqlClient);
  }

  return new InMemoryChatRepository();
}
