import type { RagRepository } from "../rag/rag.repository";
import type { BotRecord } from "../rag/rag.types";
import type { RequestContext } from "../workspace";
import type { AnalyticsQuery } from "../analytics/analytics-query";
import {
  isWithinAnalyticsRange,
  matchesAnalyticsBot,
} from "../analytics/analytics-query";
import type { ConversationListQuery } from "./conversation-list-query";
import {
  isHighIntentConversation,
  resolveConversationListIntentLabel,
} from "./intent-labels";
import type { ChatRepository } from "./chat.repository";
import { ChatAccessError, ChatService, ChatRateLimitError, ChatValidationError } from "./chat.service";
import type {
  ChatStreamRequest,
  ConversationRecord,
  LeadMetaRecord,
  LeadRecord,
  LeadStatus,
  LeadSubmissionRequest,
  MessageRecord,
} from "./chat.types";
import { createLeadCreatedFollowUp, leadStatusLabel } from "./lead-follow-up";

export { ChatAccessError, ChatRateLimitError, ChatValidationError };

function buildLeadFollowUpRecords(input: {
  lead: LeadRecord;
  meta: LeadMetaRecord | null;
}) {
  if (input.meta?.followUpRecords?.length) {
    return [...input.meta.followUpRecords].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  const records = [createLeadCreatedFollowUp(input.lead.id, input.lead.createdAt)];

  if (input.meta?.assignee) {
    records.push({
      id: `follow-assignee-${input.lead.id}`,
      kind: "assignee",
      title: `负责人：${input.meta.assignee}`,
      actor: "workspace",
      createdAt: input.meta.updatedAt,
    });
  }

  records.push({
    id: `follow-status-${input.lead.id}`,
    kind: "status",
    title: `状态：${leadStatusLabel(input.meta?.status ?? "new")}`,
    createdAt: input.meta?.updatedAt ?? input.lead.createdAt,
  });

  if (input.meta?.notes?.trim()) {
    records.push({
      id: `follow-note-${input.lead.id}`,
      kind: "note",
      title: "最新跟进备注",
      body: input.meta.notes.trim(),
      actor: input.meta.assignee,
      createdAt: input.meta.updatedAt,
    });
  }

  return records.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function mapLeadListItem(input: {
  lead: LeadRecord;
  meta: LeadMetaRecord | null;
  bot: BotRecord | null;
  messages: MessageRecord[];
}) {
  const { lead, meta, bot, messages } = input;
  const lastQuestion =
    lead.keyQuestion ??
    [...messages].reverse().find((message) => message.role === "user")?.content;
  const name = lead.fields.name || "Visitor";
  const contact =
    lead.fields.phone || lead.fields.email || lead.fields.company || "-";

  return {
    id: lead.id,
    name,
    contact,
    sourceBotId: lead.botId,
    sourceBot: bot?.name ?? lead.botId,
    lastQuestion: lastQuestion ?? "No question captured",
    summary: lead.summary ?? null,
    sourceSiteId: lead.sourceSiteId ?? null,
    sourceSiteName: lead.sourceSiteName ?? null,
    status: meta?.status ?? "new",
    assignee: meta?.assignee ?? null,
    notes: meta?.notes ?? "",
    conversationId: lead.conversationId,
    email: lead.fields.email,
    phone: lead.fields.phone,
    company: lead.fields.company,
    requirement: lead.fields.requirement,
    attachments: lead.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      mimeType: attachment.fileType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
      uploadedAt: attachment.createdAt,
      status: attachment.status ?? (attachment.storageKey ? "ready" : "failed"),
      errorMessage: attachment.errorMessage,
      downloadUrl:
        attachment.status === "failed" || !attachment.storageKey
          ? undefined
          : `/leads/${lead.id}/attachments/${attachment.id}`,
    })),
    followUpRecords: buildLeadFollowUpRecords({ lead, meta }),
    createdAt: lead.createdAt,
    updatedAt: meta?.updatedAt ?? lead.createdAt,
  };
}

export interface ConversationListItem {
  id: string;
  visitorLabel: string;
  summary: string;
  botId: string;
  botName: string;
  status: "open" | "resolved" | "unresolved" | "pending";
  hasLead: boolean;
  highIntent: boolean;
  aiIntentLabel: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationDetailPayload extends ConversationListItem {
  visitorId: string;
  tags: string[];
  assignee: string | null;
  aiInsight: {
    intent: string | null;
    productLine: string | null;
    confidence: number | null;
    missingFields: string[];
    leadCaptureRecommended: boolean;
    suggestedQuestions: string[];
    highIntentTurnCount: number;
    lastEvaluatedAt: string | null;
  } | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
    citations?: Array<{ id: string; title: string; excerpt: string }>;
  }>;
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

export interface DashboardKpiPayload {
  id: string;
  label: string;
  value: string;
  description: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
}

export interface TrendPointPayload {
  date: string;
  label: string;
  sessions: number;
  leads: number;
}

export interface InsightItemPayload {
  id: string;
  question: string;
  count: number;
  botName?: string;
}

export interface UnresolvedItemPayload {
  id: string;
  question: string;
  askedAt: string;
  botName: string;
  citedSource?: string;
}

export interface RecentLeadPayload {
  id: string;
  name: string;
  contact: string;
  sourceBot: string;
  lastQuestion: string;
  status: LeadStatus;
  createdAt: string;
}

export interface ChannelDistributionPayload {
  label: string;
  sessions: number;
}

export interface DashboardSnapshotPayload {
  hasBots: boolean;
  kpis: DashboardKpiPayload[];
  trend7: TrendPointPayload[];
  trend30: TrendPointPayload[];
  frequentQuestions: InsightItemPayload[];
  unresolvedQuestions: UnresolvedItemPayload[];
  recentLeads: RecentLeadPayload[];
  channelDistribution: ChannelDistributionPayload[];
}

export interface ReportPeriodSummaryPayload {
  sessions7d: number;
  sessions30d: number;
  leads7d: number;
  leads30d: number;
  unresolvedRate: string;
}

export interface ReportBotMetricPayload {
  id: string;
  botName: string;
  sessions7d: number;
  leads7d: number;
  leadRate: string;
  avgResponse: string;
  unresolvedCount: number;
}

export interface ReportCitationMetricPayload {
  id: string;
  title: string;
  excerpt: string;
  hitCount: number;
  botName?: string;
}

export interface ReportSnapshotPayload {
  hasBots: boolean;
  period: ReportPeriodSummaryPayload;
  trend7: TrendPointPayload[];
  trend30: TrendPointPayload[];
  botMetrics: ReportBotMetricPayload[];
  frequentQuestions: InsightItemPayload[];
  unresolvedQuestions: UnresolvedItemPayload[];
  topCitations: ReportCitationMetricPayload[];
}

function visitorLabel(visitorId: string): string {
  return `Visitor #${visitorId.slice(-4)}`;
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate()
  );
}

function buildDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLabel(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercentChange(current: number, previous: number): string {
  if (previous <= 0) {
    return current > 0 ? "+100%" : "0%";
  }

  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta);
  return `${delta >= 0 ? "+" : ""}${rounded}%`;
}

function formatSignedDelta(current: number, previous: number): string {
  const delta = current - previous;
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

function formatSeconds(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0.0s";
  }

  return `${value.toFixed(1)}s`;
}

function normalizeChannelLabel(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) {
    return "Unknown";
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./i, "") || "Unknown";
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0] || "Unknown";
  }
}

function responseTrendDirection(
  current: number | null,
  baseline: number | null,
): "up" | "down" | "neutral" {
  if (current === null || baseline === null) {
    return "neutral";
  }

  if (current < baseline) {
    return "up";
  }

  if (current > baseline) {
    return "down";
  }

  return "neutral";
}

function deriveStatus(
  messages: MessageRecord[],
  metaStatus: "open" | "resolved" | "unresolved" | "pending" | undefined,
): ConversationListItem["status"] {
  if (metaStatus) {
    return metaStatus;
  }

  const lastAssistant = [...messages].reverse().find(
    (message) => message.role === "assistant",
  );
  if (
    lastAssistant?.content.includes("do not have enough verified material")
    || lastAssistant?.content.includes("follow up")
  ) {
    return "unresolved";
  }

  return "open";
}

function inferAverageResponseSeconds(messages: MessageRecord[]): number | null {
  const durations: number[] = [];

  for (let index = 1; index < messages.length; index += 1) {
    const current = messages[index];
    const previous = messages[index - 1];

    if (!current || !previous) {
      continue;
    }

    if (current.role !== "assistant" || previous.role !== "user") {
      continue;
    }

    const delta =
      new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
    if (delta >= 0) {
      durations.push(delta / 1000);
    }
  }

  if (durations.length === 0) {
    return null;
  }

  return durations.reduce((sum, item) => sum + item, 0) / durations.length;
}

async function mapConversationSummary(
  summary: Awaited<ReturnType<ChatService["listConversations"]>>["items"][number],
  chatRepository: ChatRepository,
  ragRepository: RagRepository,
): Promise<ConversationListItem> {
  const bot = await ragRepository.findBotById(summary.botId);
  const messages = await chatRepository.listMessagesByConversation(summary.id);
  const lastMessage = messages.at(-1);
  const lead = await chatRepository.findLeadByConversation(summary.id);
  const meta = await chatRepository.getConversationMeta(summary.id);

  return {
    id: summary.id,
    visitorLabel: visitorLabel(summary.visitorId),
    summary: summary.lastMessagePreview ?? "New conversation",
    botId: summary.botId,
    botName: bot?.name ?? summary.botId,
    status: deriveStatus(messages, meta?.status),
    hasLead: Boolean(lead),
    highIntent: isHighIntentConversation(meta ?? undefined),
    aiIntentLabel: resolveConversationListIntentLabel(meta ?? undefined),
    updatedAt: lastMessage?.createdAt ?? summary.createdAt,
    createdAt: summary.createdAt,
  };
}

async function mapConversationDetail(
  detail: Awaited<ReturnType<ChatService["getConversation"]>>,
  chatRepository: ChatRepository,
  ragRepository: RagRepository,
): Promise<ConversationDetailPayload> {
  const listItem = await mapConversationSummary(detail, chatRepository, ragRepository);
  const meta = await chatRepository.getConversationMeta(detail.id);
  const lead = await chatRepository.findLeadByConversation(detail.id);

  return {
    ...listItem,
    status: meta?.status ?? listItem.status,
    tags: meta?.tags ?? [],
    assignee: meta?.assignee ?? null,
    aiInsight:
      meta?.aiIntent ||
      meta?.aiProductLine ||
      meta?.aiConfidence !== null ||
      (meta?.aiMissingFields?.length ?? 0) > 0 ||
      meta?.aiLeadCaptureRecommended !== null ||
      (meta?.aiSuggestedQuestions?.length ?? 0) > 0 ||
      (meta?.aiHighIntentTurnCount ?? 0) > 0 ||
      meta?.aiLastEvaluatedAt
        ? {
            intent: meta?.aiIntent ?? null,
            productLine: meta?.aiProductLine ?? null,
            confidence: meta?.aiConfidence ?? null,
            missingFields: meta?.aiMissingFields ?? [],
            leadCaptureRecommended: meta?.aiLeadCaptureRecommended ?? false,
            suggestedQuestions: meta?.aiSuggestedQuestions ?? [],
            highIntentTurnCount: meta?.aiHighIntentTurnCount ?? 0,
            lastEvaluatedAt: meta?.aiLastEvaluatedAt ?? null,
          }
        : null,
    visitorId: detail.visitorId,
    channel: "Website Widget",
    pageUrl: detail.origin,
    lead: lead
      ? {
          name: lead.fields.name ?? "Visitor",
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
    })),
  };
}

async function collectWorkspaceAnalytics(
  workspaceId: string,
  chatRepository: ChatRepository,
  ragRepository: RagRepository,
  query: AnalyticsQuery = {},
): Promise<{
  bots: Awaited<ReturnType<RagRepository["listBotsByWorkspace"]>>;
  conversations: Awaited<ReturnType<ChatRepository["listConversationsByWorkspace"]>>;
  messagesByConversation: Map<string, MessageRecord[]>;
  leads: Awaited<ReturnType<ChatRepository["listLeadsByWorkspace"]>>;
  conversationMeta: Map<
    string,
    Awaited<ReturnType<ChatRepository["getConversationMeta"]>>
  >;
}> {
  const bots = await ragRepository.listBotsByWorkspace(workspaceId);
  const conversations = (await chatRepository.listConversationsByWorkspace(workspaceId))
    .filter(
      (conversation) =>
        matchesAnalyticsBot(conversation, query)
        && isWithinAnalyticsRange(conversation.createdAt, query),
    );
  const leads = (await chatRepository.listLeadsByWorkspace(workspaceId)).filter(
    (lead) =>
      matchesAnalyticsBot(lead, query) && isWithinAnalyticsRange(lead.createdAt, query),
  );
  const messagesByConversation = new Map<string, MessageRecord[]>();
  const conversationMeta = new Map<
    string,
    Awaited<ReturnType<ChatRepository["getConversationMeta"]>>
  >();

  for (const conversation of conversations) {
    messagesByConversation.set(
      conversation.id,
      await chatRepository.listMessagesByConversation(conversation.id),
    );
    conversationMeta.set(
      conversation.id,
      await chatRepository.getConversationMeta(conversation.id),
    );
  }

  return {
    bots,
    conversations,
    messagesByConversation,
    leads,
    conversationMeta,
  };
}

function buildTrendSeries(
  days: number,
  now: Date,
  conversations: ConversationRecord[],
  leads: LeadRecord[],
): TrendPointPayload[] {
  const points: TrendPointPayload[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - offset);
    const dayKey = buildDayKey(date);

    points.push({
      date: dayKey,
      label: toLabel(date),
      sessions: conversations.filter(
        (conversation) => buildDayKey(new Date(conversation.createdAt)) === dayKey,
      ).length,
      leads: leads.filter((lead) => buildDayKey(new Date(lead.createdAt)) === dayKey).length,
    });
  }

  return points;
}

function sumTrendField(points: TrendPointPayload[], field: "sessions" | "leads"): number {
  return points.reduce((sum, point) => sum + point[field], 0);
}

function buildChannelDistribution(
  conversations: ConversationRecord[],
): ChannelDistributionPayload[] {
  const counts = new Map<string, number>();

  for (const conversation of conversations) {
    const label = normalizeChannelLabel(conversation.origin);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, sessions]) => ({
      label,
      sessions,
    }));
}

async function buildFrequentQuestions(
  conversations: ConversationRecord[],
  messagesByConversation: Map<string, MessageRecord[]>,
  ragRepository: RagRepository,
): Promise<InsightItemPayload[]> {
  const counts = new Map<string, { count: number; botName?: string }>();

  for (const conversation of conversations) {
    const botName = (await ragRepository.findBotById(conversation.botId))?.name;

    for (const message of messagesByConversation.get(conversation.id) ?? []) {
      if (message.role !== "user") {
        continue;
      }

      const question = message.content.trim();
      if (!question) {
        continue;
      }

      const current = counts.get(question) ?? { count: 0, botName };
      counts.set(question, {
        count: current.count + 1,
        botName: current.botName ?? botName,
      });
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 5)
    .map(([question, meta], index) => ({
      id: `fq-${index + 1}`,
      question,
      count: meta.count,
      botName: meta.botName,
    }));
}

async function buildUnresolvedQuestions(
  conversations: ConversationRecord[],
  messagesByConversation: Map<string, MessageRecord[]>,
  conversationMeta: Map<string, Awaited<ReturnType<ChatRepository["getConversationMeta"]>>>,
  ragRepository: RagRepository,
): Promise<UnresolvedItemPayload[]> {
  const items = await Promise.all(
    conversations.map(async (conversation) => {
      const messages = messagesByConversation.get(conversation.id) ?? [];
      const meta = conversationMeta.get(conversation.id) ?? undefined;
      const status = deriveStatus(messages, meta?.status);
      const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

      if (!lastUserMessage) {
        return null;
      }

      if (status !== "unresolved" && status !== "pending") {
        return null;
      }

      return {
        id: conversation.id,
        question: lastUserMessage.content,
        askedAt: lastUserMessage.createdAt,
        botName:
          (await ragRepository.findBotById(conversation.botId))?.name ?? conversation.botId,
      };
    }),
  );

  return items
    .filter((item): item is UnresolvedItemPayload => item !== null)
    .slice(0, 5);
}

async function buildTopCitations(
  workspaceId: string,
  ragRepository: RagRepository,
): Promise<ReportCitationMetricPayload[]> {
  const grouped = new Map<
    string,
    { title: string; excerpt: string; hitCount: number }
  >();

  for (const chunk of await ragRepository.listChunks()) {
    if (chunk.workspaceId !== workspaceId) {
      continue;
    }

    const current = grouped.get(chunk.documentId);
    if (current) {
      current.hitCount += 1;
      continue;
    }

    grouped.set(chunk.documentId, {
      title: chunk.documentTitle,
      excerpt: chunk.content.slice(0, 140),
      hitCount: 1,
    });
  }

  return [...grouped.entries()]
    .sort((left, right) => right[1].hitCount - left[1].hitCount)
    .slice(0, 5)
    .map(([id, meta]) => ({
      id,
      title: meta.title,
      excerpt: meta.excerpt,
      hitCount: meta.hitCount,
    }));
}

export class PublicChatApi {
  constructor(
    private readonly service: ChatService,
    private readonly chatRepository: ChatRepository,
    private readonly ragRepository: RagRepository,
  ) {}

  async stream(body: ChatStreamRequest) {
    return this.service.stream(body);
  }

  streamLive(body: ChatStreamRequest) {
    return this.service.streamLive(body);
  }

  getPublicWidgetConfig(input: { botId: string; siteKey: string; origin: string }) {
    return this.service.getPublicWidgetConfig(input);
  }

  async submitLead(body: LeadSubmissionRequest) {
    return this.service.submitLead(body);
  }

  async listConversations(
    context: RequestContext,
    options?: ConversationListQuery,
  ) {
    let listQuery = options;

    if (options?.q) {
      const bots = await this.ragRepository.listBotsByWorkspace(context.workspaceId);
      const qLower = options.q.toLowerCase();
      const qBotIds = bots
        .filter((bot) => bot.name.toLowerCase().includes(qLower))
        .map((bot) => bot.id);
      listQuery = { ...options, qBotIds };
    }

    const page = await this.service.listConversations(context.workspaceId, listQuery);
    const items = await Promise.all(
      page.items.map((summary) =>
        mapConversationSummary(summary, this.chatRepository, this.ragRepository),
      ),
    );
    return { items, nextCursor: page.nextCursor };
  }

  async getConversation(context: RequestContext, conversationId: string) {
    const detail = await this.service.getConversation(context.workspaceId, conversationId);
    return mapConversationDetail(detail, this.chatRepository, this.ragRepository);
  }

  async updateConversation(
    context: RequestContext,
    conversationId: string,
    patch: {
      status?: "open" | "resolved" | "unresolved" | "pending";
      tags?: string[];
      assignee?: string | null;
    },
  ) {
    await this.service.getConversation(context.workspaceId, conversationId);
    await this.chatRepository.upsertConversationMeta(conversationId, {
      status: patch.status,
      tags: patch.tags,
      assignee: patch.assignee,
    });
    return this.getConversation(context, conversationId);
  }

  async getPreviewSite(context: RequestContext, botId: string) {
    return this.service.getPreviewSite(context.workspaceId, botId);
  }

  async listLeads(context: RequestContext) {
    const items = await this.service.listLeads(context.workspaceId);
    return items.map((item) => mapLeadListItem(item));
  }

  async getLead(context: RequestContext, leadId: string) {
    const item = await this.service.getLead(context.workspaceId, leadId);
    return mapLeadListItem(item);
  }

  async readLeadAttachment(
    context: RequestContext,
    leadId: string,
    attachmentId: string,
  ) {
    return this.service.readLeadAttachment(context.workspaceId, leadId, attachmentId);
  }

  async updateLead(
    context: RequestContext,
    leadId: string,
    patch: {
      status?: LeadStatus;
      assignee?: string | null;
      notes?: string;
    },
  ) {
    await this.service.updateLead(context.workspaceId, leadId, patch, context.userId);
    return this.getLead(context, leadId);
  }

  async listSites(context: RequestContext) {
    return this.service.listSites(context.workspaceId);
  }

  async updateSite(
    context: RequestContext,
    siteId: string,
    patch: {
      allowedDomains?: string[];
      name?: string;
      status?: "active" | "disabled";
    },
  ) {
    return this.service.updateSite(context.workspaceId, siteId, patch);
  }

  async rotateSiteKey(context: RequestContext, siteId: string) {
    return this.service.rotateSiteKey(context.workspaceId, siteId, context.userId);
  }

  async testSiteMessage(
    context: RequestContext,
    siteId: string,
    input: { origin: string; message: string },
  ) {
    return this.service.testSiteMessage(context.workspaceId, siteId, input);
  }

  async getDashboardSnapshot(
    context: RequestContext,
    query: AnalyticsQuery = {},
  ): Promise<DashboardSnapshotPayload> {
    const analytics = await collectWorkspaceAnalytics(
      context.workspaceId,
      this.chatRepository,
      this.ragRepository,
      query,
    );
    const now = new Date();

    if (analytics.bots.length === 0) {
      return {
        hasBots: false,
        kpis: [],
        trend7: [],
        trend30: [],
        frequentQuestions: [],
        unresolvedQuestions: [],
        recentLeads: [],
        channelDistribution: [],
      };
    }

    const trend7 = buildTrendSeries(7, now, analytics.conversations, analytics.leads);
    const trend30 = buildTrendSeries(30, now, analytics.conversations, analytics.leads);
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const sessionsToday = analytics.conversations.filter((conversation) =>
      isSameDay(new Date(conversation.createdAt), today),
    );
    const sessionsYesterday = analytics.conversations.filter((conversation) =>
      isSameDay(new Date(conversation.createdAt), yesterday),
    );
    const leadsToday = analytics.leads.filter((lead) =>
      isSameDay(new Date(lead.createdAt), today),
    );
    const leadsYesterday = analytics.leads.filter((lead) =>
      isSameDay(new Date(lead.createdAt), yesterday),
    );
    const visitorsToday = new Set(sessionsToday.map((conversation) => conversation.visitorId));
    const visitorsYesterday = new Set(
      sessionsYesterday.map((conversation) => conversation.visitorId),
    );

    const responseSamplesAll = [...analytics.messagesByConversation.values()]
      .map((messages) => inferAverageResponseSeconds(messages))
      .filter((value): value is number => value !== null);
    const responseSamplesToday = sessionsToday
      .map((conversation) =>
        inferAverageResponseSeconds(
          analytics.messagesByConversation.get(conversation.id) ?? [],
        ),
      )
      .filter((value): value is number => value !== null);

    const averageResponseAll = responseSamplesAll.length
      ? responseSamplesAll.reduce((sum, item) => sum + item, 0) / responseSamplesAll.length
      : null;
    const averageResponseToday = responseSamplesToday.length
      ? responseSamplesToday.reduce((sum, item) => sum + item, 0) / responseSamplesToday.length
      : averageResponseAll;

    return {
      hasBots: true,
      kpis: [
        {
          id: "sessions",
          label: "Today's conversations",
          value: String(sessionsToday.length),
          description: "Conversations created today across all active sites.",
          trend: formatSignedPercentChange(sessionsToday.length, sessionsYesterday.length),
          trendDirection:
            sessionsToday.length === sessionsYesterday.length
              ? "neutral"
              : sessionsToday.length > sessionsYesterday.length
                ? "up"
                : "down",
        },
        {
          id: "visitors",
          label: "Today's visitors",
          value: String(visitorsToday.size),
          description: "Unique visitor ids seen in today's conversations.",
          trend: formatSignedPercentChange(visitorsToday.size, visitorsYesterday.size),
          trendDirection:
            visitorsToday.size === visitorsYesterday.size
              ? "neutral"
              : visitorsToday.size > visitorsYesterday.size
                ? "up"
                : "down",
        },
        {
          id: "leads",
          label: "Today's leads",
          value: String(leadsToday.length),
          description: "Lead submissions captured from public chat.",
          trend: formatSignedDelta(leadsToday.length, leadsYesterday.length),
          trendDirection:
            leadsToday.length === leadsYesterday.length
              ? "neutral"
              : leadsToday.length > leadsYesterday.length
                ? "up"
                : "down",
        },
        {
          id: "response",
          label: "Average response",
          value: formatSeconds(averageResponseToday),
          description: "Average delay between the latest user prompt and assistant reply.",
          trend:
            averageResponseToday === null || averageResponseAll === null
              ? "stable"
              : averageResponseToday <= averageResponseAll
                ? "stable"
                : "slower",
          trendDirection: responseTrendDirection(averageResponseToday, averageResponseAll),
        },
      ],
      trend7,
      trend30,
      frequentQuestions: await buildFrequentQuestions(
        analytics.conversations,
        analytics.messagesByConversation,
        this.ragRepository,
      ),
      unresolvedQuestions: await buildUnresolvedQuestions(
        analytics.conversations,
        analytics.messagesByConversation,
        analytics.conversationMeta,
        this.ragRepository,
      ),
      channelDistribution: buildChannelDistribution(analytics.conversations),
      recentLeads: (await this.listLeads(context)).slice(0, 5).map((lead) => ({
        id: lead.id,
        name: lead.name,
        contact: lead.contact,
        sourceBot: lead.sourceBot,
        lastQuestion: lead.lastQuestion,
        status: lead.status,
        createdAt: lead.createdAt,
      })),
    };
  }

  async getReportSnapshot(
    context: RequestContext,
    query: AnalyticsQuery = {},
  ): Promise<ReportSnapshotPayload> {
    const analytics = await collectWorkspaceAnalytics(
      context.workspaceId,
      this.chatRepository,
      this.ragRepository,
      query,
    );
    const now = new Date();

    if (analytics.bots.length === 0) {
      return {
        hasBots: false,
        period: {
          sessions7d: 0,
          sessions30d: 0,
          leads7d: 0,
          leads30d: 0,
          unresolvedRate: "0.0%",
        },
        trend7: [],
        trend30: [],
        botMetrics: [],
        frequentQuestions: [],
        unresolvedQuestions: [],
        topCitations: [],
      };
    }

    const trend7 = buildTrendSeries(7, now, analytics.conversations, analytics.leads);
    const trend30 = buildTrendSeries(30, now, analytics.conversations, analytics.leads);
    const unresolvedQuestions = await buildUnresolvedQuestions(
      analytics.conversations,
      analytics.messagesByConversation,
      analytics.conversationMeta,
      this.ragRepository,
    );
    const unresolvedConversationIds = new Set(unresolvedQuestions.map((item) => item.id));

    const botMetrics = analytics.bots.map((bot) => {
      const botConversations = analytics.conversations.filter(
        (conversation) => conversation.botId === bot.id,
      );
      const botConversations7d = botConversations.filter(
        (conversation) =>
          new Date(conversation.createdAt).getTime()
          >= now.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const botLeads7d = analytics.leads.filter(
        (lead) =>
          lead.botId === bot.id
          && new Date(lead.createdAt).getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const responseSamples = botConversations
        .map((conversation) =>
          inferAverageResponseSeconds(
            analytics.messagesByConversation.get(conversation.id) ?? [],
          ),
        )
        .filter((value): value is number => value !== null);
      const averageResponse = responseSamples.length
        ? responseSamples.reduce((sum, item) => sum + item, 0) / responseSamples.length
        : null;

      return {
        id: bot.id,
        botName: bot.name,
        sessions7d: botConversations7d.length,
        leads7d: botLeads7d.length,
        leadRate:
          botConversations7d.length > 0
            ? formatPercent(botLeads7d.length / botConversations7d.length)
            : "0.0%",
        avgResponse: formatSeconds(averageResponse),
        unresolvedCount: botConversations.filter((conversation) =>
          unresolvedConversationIds.has(conversation.id),
        ).length,
      };
    });

    return {
      hasBots: true,
      period: {
        sessions7d: sumTrendField(trend7, "sessions"),
        sessions30d: sumTrendField(trend30, "sessions"),
        leads7d: sumTrendField(trend7, "leads"),
        leads30d: sumTrendField(trend30, "leads"),
        unresolvedRate:
          sumTrendField(trend30, "sessions") > 0
            ? formatPercent(
                unresolvedConversationIds.size / sumTrendField(trend30, "sessions"),
              )
            : "0.0%",
      },
      trend7,
      trend30,
      botMetrics,
      frequentQuestions: await buildFrequentQuestions(
        analytics.conversations,
        analytics.messagesByConversation,
        this.ragRepository,
      ),
      unresolvedQuestions,
      topCitations: await buildTopCitations(context.workspaceId, this.ragRepository),
    };
  }
}

export function toChatHttpError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
  retryAfterSec?: number;
} {
  if (error instanceof ChatAccessError) {
    return {
      statusCode: error.code === "UNAUTHORIZED" ? 401 : 403,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof ChatValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  if (error instanceof ChatRateLimitError) {
    return {
      statusCode: 429,
      code: "RATE_LIMITED",
      message: error.message,
      retryAfterSec: error.retryAfterSec,
    };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Unexpected error.",
  };
}
