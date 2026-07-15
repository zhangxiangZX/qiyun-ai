import { hashSiteKey } from "../security/site-key";
import type { ConversationListQuery } from "./conversation-list-query";
import type {
  ConversationRecord,
  LeadMetaRecord,
  LeadRecord,
  MessageRecord,
  PendingLeadAttachment,
  SiteRecord,
  SiteKeyAuditRecord,
} from "./chat.types";

export interface ConversationMetaRecord {
  status?: "open" | "resolved" | "unresolved" | "pending";
  tags?: string[];
  assignee?: string | null;
  aiIntent?: string | null;
  aiProductLine?: string | null;
  aiConfidence?: number | null;
  aiMissingFields?: string[];
  aiLeadCaptureRecommended?: boolean | null;
  aiSuggestedQuestions?: string[];
  aiHighIntentTurnCount?: number;
  aiLastEvaluatedAt?: string | null;
  aiLastLeadPromptAt?: string | null;
}

export interface ChatRepository {
  createSite(
    record: SiteRecord,
    secret: { siteKey: string; siteKeyHash: string },
  ): Promise<SiteRecord>;
  listSitesByWorkspace(workspaceId: string): Promise<SiteRecord[]>;
  findSiteByKey(siteKey: string): Promise<SiteRecord | null>;
  findSiteByBotId(workspaceId: string, botId: string): Promise<SiteRecord | null>;
  rotateSiteKey(
    siteId: string,
    secret: { siteKey: string; siteKeyHash: string; siteKeyPrefix: string },
  ): Promise<SiteRecord | null>;
  updateSite(record: SiteRecord): Promise<SiteRecord>;
  deleteSite(workspaceId: string, siteId: string): Promise<boolean>;
  createSiteKeyAudit(record: SiteKeyAuditRecord): Promise<void>;
  createConversation(record: ConversationRecord): Promise<ConversationRecord>;
  findConversationById(
    workspaceId: string,
    id: string,
  ): Promise<ConversationRecord | null>;
  listConversationsByWorkspace(workspaceId: string): Promise<ConversationRecord[]>;
  listConversationsPage(
    workspaceId: string,
    input: ConversationListQuery,
  ): Promise<{ items: ConversationRecord[]; nextCursor: string | null }>;
  getConversationMeta(conversationId: string): Promise<ConversationMetaRecord | null>;
  upsertConversationMeta(
    conversationId: string,
    patch: ConversationMetaRecord,
  ): Promise<ConversationMetaRecord>;
  createMessage(record: MessageRecord): Promise<MessageRecord>;
  listMessagesByConversation(conversationId: string): Promise<MessageRecord[]>;
  createLead(record: LeadRecord): Promise<LeadRecord>;
  updateLead(record: LeadRecord): Promise<LeadRecord>;
  listLeadsByWorkspace(workspaceId: string): Promise<LeadRecord[]>;
  findLeadByConversation(conversationId: string): Promise<LeadRecord | null>;
  findLeadById(workspaceId: string, id: string): Promise<LeadRecord | null>;
  getLeadMeta(leadId: string): Promise<LeadMetaRecord | null>;
  upsertLeadMeta(record: LeadMetaRecord): Promise<LeadMetaRecord>;
  // 预上传线索附件（pending）：建线索前暂存，建线索时引用并消费。
  createPendingLeadAttachment(record: PendingLeadAttachment): Promise<void>;
  findPendingLeadAttachment(workspaceId: string, id: string): Promise<PendingLeadAttachment | null>;
  findPendingLeadAttachmentById(id: string): Promise<PendingLeadAttachment | null>;
  deletePendingLeadAttachment(id: string): Promise<void>;
}

export interface TransactionalChatRepository extends ChatRepository {
  withTransaction<T>(fn: (repository: ChatRepository) => Promise<T>): Promise<T>;
}

export class InMemoryChatRepository implements TransactionalChatRepository {
  private readonly sitesByHash = new Map<string, SiteRecord>();
  private readonly sitesByBot = new Map<string, SiteRecord>();
  private readonly sitesById = new Map<string, SiteRecord>();
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly conversationMeta = new Map<string, ConversationMetaRecord>();
  private readonly messages = new Map<string, MessageRecord>();
  private readonly leads = new Map<string, LeadRecord>();
  private readonly leadMeta = new Map<string, LeadMetaRecord>();
  private readonly pendingLeadAttachments = new Map<string, PendingLeadAttachment>();

  loadSnapshot(input: {
    sites: SiteRecord[];
    conversations: ConversationRecord[];
    conversationMeta: Array<{ conversationId: string; meta: ConversationMetaRecord }>;
    messages: MessageRecord[];
    leads: LeadRecord[];
    leadMeta: LeadMetaRecord[];
    pendingLeadAttachments?: PendingLeadAttachment[];
  }): void {
    this.sitesByHash.clear();
    this.sitesByBot.clear();
    this.sitesById.clear();
    this.conversations.clear();
    this.conversationMeta.clear();
    this.messages.clear();
    this.leads.clear();
    this.leadMeta.clear();
    this.pendingLeadAttachments.clear();

    for (const record of input.sites) {
      this.sitesByBot.set(`${record.workspaceId}:${record.botId}`, record);
      this.sitesById.set(record.id, record);
    }

    for (const record of input.conversations) {
      this.conversations.set(record.id, record);
    }

    for (const entry of input.conversationMeta) {
      this.conversationMeta.set(entry.conversationId, entry.meta);
    }

    for (const record of input.messages) {
      this.messages.set(record.id, record);
    }

    for (const record of input.leads) {
      this.leads.set(record.id, record);
    }

    for (const record of input.leadMeta) {
      this.leadMeta.set(record.leadId, record);
    }

    for (const record of input.pendingLeadAttachments ?? []) {
      this.pendingLeadAttachments.set(record.id, record);
    }
  }

  dumpSnapshot(): {
    sites: SiteRecord[];
    conversations: ConversationRecord[];
    conversationMeta: Array<{ conversationId: string; meta: ConversationMetaRecord }>;
    messages: MessageRecord[];
    leads: LeadRecord[];
    leadMeta: LeadMetaRecord[];
    pendingLeadAttachments: PendingLeadAttachment[];
  } {
    return {
      sites: [...this.sitesById.values()],
      conversations: [...this.conversations.values()],
      conversationMeta: [...this.conversationMeta.entries()].map(([conversationId, meta]) => ({
        conversationId,
        meta,
      })),
      messages: [...this.messages.values()],
      leads: [...this.leads.values()],
      leadMeta: [...this.leadMeta.values()],
      pendingLeadAttachments: [...this.pendingLeadAttachments.values()],
    };
  }

  async createSite(
    record: SiteRecord,
    secret: { siteKey: string; siteKeyHash: string },
  ): Promise<SiteRecord> {
    this.sitesByHash.set(secret.siteKeyHash, record);
    this.sitesByBot.set(`${record.workspaceId}:${record.botId}`, record);
    this.sitesById.set(record.id, record);
    return record;
  }

  async listSitesByWorkspace(workspaceId: string): Promise<SiteRecord[]> {
    return [...this.sitesById.values()].filter(
      (site) => site.workspaceId === workspaceId,
    );
  }

  async findSiteByKey(siteKey: string): Promise<SiteRecord | null> {
    return this.sitesByHash.get(hashSiteKey(siteKey)) ?? null;
  }

  async findSiteByBotId(
    workspaceId: string,
    botId: string,
  ): Promise<SiteRecord | null> {
    return this.sitesByBot.get(`${workspaceId}:${botId}`) ?? null;
  }

  async rotateSiteKey(
    siteId: string,
    secret: { siteKey: string; siteKeyHash: string; siteKeyPrefix: string },
  ): Promise<SiteRecord | null> {
    const current = this.sitesById.get(siteId);
    if (!current) {
      return null;
    }

    for (const [existingHash, site] of this.sitesByHash.entries()) {
      if (site.id === siteId) {
        this.sitesByHash.delete(existingHash);
      }
    }
    const next = { ...current, siteKeyPrefix: secret.siteKeyPrefix };
    this.sitesByHash.set(secret.siteKeyHash, next);
    this.sitesByBot.set(`${next.workspaceId}:${next.botId}`, next);
    this.sitesById.set(next.id, next);
    return next;
  }

  async updateSite(record: SiteRecord): Promise<SiteRecord> {
    const current = this.sitesById.get(record.id);
    if (!current) {
      throw new Error("Site not found.");
    }

    for (const [existingHash, site] of this.sitesByHash.entries()) {
      if (site.id === record.id) {
        this.sitesByHash.set(existingHash, record);
      }
    }
    this.sitesByBot.set(`${record.workspaceId}:${record.botId}`, record);
    this.sitesById.set(record.id, record);
    return record;
  }

  async deleteSite(workspaceId: string, siteId: string): Promise<boolean> {
    const site = this.sitesById.get(siteId);
    if (!site || site.workspaceId !== workspaceId) {
      return false;
    }
    this.sitesById.delete(siteId);
    this.sitesByBot.delete(`${site.workspaceId}:${site.botId}`);
    for (const [hash, s] of this.sitesByHash.entries()) {
      if (s.id === siteId) {
        this.sitesByHash.delete(hash);
      }
    }
    return true;
  }

  async createSiteKeyAudit(): Promise<void> {}

  async createConversation(record: ConversationRecord): Promise<ConversationRecord> {
    this.conversations.set(record.id, record);
    return record;
  }

  async findConversationById(
    workspaceId: string,
    id: string,
  ): Promise<ConversationRecord | null> {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.workspaceId !== workspaceId) {
      return null;
    }
    return conversation;
  }

  async listConversationsByWorkspace(
    workspaceId: string,
  ): Promise<ConversationRecord[]> {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.workspaceId === workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async listConversationsPage(
    workspaceId: string,
    input: ConversationListQuery,
  ): Promise<{ items: ConversationRecord[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(input.limit, 1), 100);
    let sorted = await this.listConversationsByWorkspace(workspaceId);

    if (input.botId) {
      sorted = sorted.filter((conversation) => conversation.botId === input.botId);
    }

    if (input.status) {
      sorted = sorted.filter((conversation) => {
        const meta = this.conversationMeta.get(conversation.id);
        return (meta?.status ?? "open") === input.status;
      });
    }

    if (input.hasLead !== undefined) {
      sorted = sorted.filter((conversation) => {
        const hasLead = [...this.leads.values()].some(
          (lead) => lead.conversationId === conversation.id,
        );
        return input.hasLead ? hasLead : !hasLead;
      });
    }

    if (input.q) {
      const query = input.q.toLowerCase();
      sorted = sorted.filter((conversation) => {
        if (conversation.visitorId.toLowerCase().includes(query)) {
          return true;
        }
        if (input.qBotIds?.includes(conversation.botId)) {
          return true;
        }
        return [...this.messages.values()].some(
          (message) =>
            message.conversationId === conversation.id
            && message.content.toLowerCase().includes(query),
        );
      });
    }

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

  async getConversationMeta(
    conversationId: string,
  ): Promise<ConversationMetaRecord | null> {
    return this.conversationMeta.get(conversationId) ?? null;
  }

  async upsertConversationMeta(
    conversationId: string,
    patch: ConversationMetaRecord,
  ): Promise<ConversationMetaRecord> {
    const current = this.conversationMeta.get(conversationId) ?? {};
    const next = { ...current, ...patch };
    this.conversationMeta.set(conversationId, next);
    return next;
  }

  async createMessage(record: MessageRecord): Promise<MessageRecord> {
    this.messages.set(record.id, record);
    return record;
  }

  async listMessagesByConversation(
    conversationId: string,
  ): Promise<MessageRecord[]> {
    return [...this.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async createLead(record: LeadRecord): Promise<LeadRecord> {
    this.leads.set(record.id, record);
    return record;
  }

  async updateLead(record: LeadRecord): Promise<LeadRecord> {
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
      [...this.leads.values()].find(
        (lead) => lead.conversationId === conversationId,
      ) ?? null
    );
  }

  async findLeadById(workspaceId: string, id: string): Promise<LeadRecord | null> {
    const lead = this.leads.get(id);
    if (!lead || lead.workspaceId !== workspaceId) {
      return null;
    }
    return lead;
  }

  async getLeadMeta(leadId: string): Promise<LeadMetaRecord | null> {
    return this.leadMeta.get(leadId) ?? null;
  }

  async upsertLeadMeta(record: LeadMetaRecord): Promise<LeadMetaRecord> {
    this.leadMeta.set(record.leadId, record);
    return record;
  }

  async createPendingLeadAttachment(record: PendingLeadAttachment): Promise<void> {
    this.pendingLeadAttachments.set(record.id, record);
  }

  async findPendingLeadAttachment(workspaceId: string, id: string): Promise<PendingLeadAttachment | null> {
    const record = this.pendingLeadAttachments.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  async findPendingLeadAttachmentById(id: string): Promise<PendingLeadAttachment | null> {
    return this.pendingLeadAttachments.get(id) ?? null;
  }

  async deletePendingLeadAttachment(id: string): Promise<void> {
    this.pendingLeadAttachments.delete(id);
  }

  async withTransaction<T>(fn: (repository: ChatRepository) => Promise<T>): Promise<T> {
    return fn(this);
  }
}
