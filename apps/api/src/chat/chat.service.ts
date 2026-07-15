import { createHash, randomUUID } from "node:crypto";

import { enterWithTenant } from "../db/tenant-context";
import {
  generateSiteKey,
  hashSiteKey,
  siteKeyPrefix,
} from "../security/site-key";
import type { RagRepository } from "../rag/rag.repository";
import type { RagService } from "../rag/rag.service";
import type { BotRecord } from "../rag/rag.types";
import type { DocumentStorage } from "../documents/document-storage";
import {
  appendLeadFollowUpRecords,
  buildLeadMetaFollowUpChanges,
  createInitialLeadFollowUpRecords,
} from "./lead-follow-up";
import {
  buildChatMessages,
  type OpenAICompatibleChatClient,
} from "../llm/llm-chat";
import {
  shouldPromptLeadCapture,
} from "./intent-labels";
import {
  sanitizeContextBlock,
  sanitizeVisitorFacingReply,
} from "./visitor-reply-sanitize";
import type { ConversationListQuery } from "./conversation-list-query";
import type { ChatRepository, TransactionalChatRepository } from "./chat.repository";
import {
  buildRateLimitMessage,
  checkNamedRateLimit,
} from "../http/rate-limit";
import {
  applyLeadCaptureRules,
  buildSessionSummary,
  extractKeyQuestion,
  normalizeLeadFieldError,
  validateLeadFields,
} from "./lead-intent";
import {
  buildLeadCaptureCoaching,
  buildRetrievalQuery,
  buildSuggestedQuestions,
  detectConsultationIntent,
  inferProductLine,
} from "./follow-up-suggestions";
import {
  judgeIntentWithLlm,
  type IntentJudgeResult,
} from "./intent-judge";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ConversationDetail,
  ConversationRecord,
  ConversationSummary,
  LeadAttachmentRecord,
  LeadMetaRecord,
  LeadRecord,
  LeadStatus,
  LeadSubmissionRequest,
  MessageRecord,
  PendingLeadAttachment,
  PendingLeadAttachmentRef,
  PublicWidgetConfig,
  SiteRecord,
  SiteSecretRecord,
} from "./chat.types";

interface ConversationAiEvaluation {
  intent: string;
  productLine: string;
  confidence: number | null;
  missingFields: string[];
  leadCaptureRecommended: boolean;
  suggestedQuestions: string[];
  highIntentTurnCount: number;
  effectiveNeedsLeadCapture: boolean;
  evaluatedAt: string;
}

export class ChatAccessError extends Error {
  constructor(
    message: string,
    readonly code: string = "FORBIDDEN",
  ) {
    super(message);
  }
}
export class ChatValidationError extends Error {}
export class ChatRateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

function normalizeLeadStatusInput(status: string): LeadStatus {
  if (status === "following") {
    return "pending";
  }

  switch (status) {
    case "new":
    case "pending":
    case "contacted":
    case "proposal":
    case "won":
    case "invalid":
      return status;
    default:
      throw new ChatValidationError(
        "Lead status must be one of new, pending, contacted, proposal, won, or invalid.",
      );
  }
}

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

function buildChatMetaEvent(
  bot: BotRecord,
  conversation: ConversationRecord,
  request: ChatStreamRequest,
): ChatStreamEvent {
  return {
    event: "meta",
    data: {
      conversationId: conversation.id,
      botId: bot.id,
      visitorId: request.visitorId,
      sdkVersion: request.sdkVersion,
      welcomeMessage: bot.welcomeMessage,
      recommendedQuestions: bot.recommendedQuestions,
    },
  };
}

// Legacy fallback kept for compatibility while production replies use the LLM path.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildAssistantReply(
  citations: Array<{ title: string; snippet: string }>,
  needsLeadCapture: boolean,
): string {
  if (citations.length === 0 || needsLeadCapture) {
    return "这块我手头资料里暂时没写得很细。您要是方便，留个联系方式或简单说说尺寸、数量，我让工程师帮您确认报价和交期。";
  }

  const primary = citations[0];
  return `${primary?.snippet ?? "我这边查到一些相关信息。"}您要是还需要报价或定制方案，留个联系方式，我们工程师好跟您对接。`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildAssistantGuidedReply(
  citations: Array<{ title: string; snippet: string }>,
  needsLeadCapture: boolean,
): string {
  if (citations.length === 0 || needsLeadCapture) {
    return [
      "这块我暂时查不太准，得看您具体用在什么场景。",
      "您方便说下产品类型、大概尺寸和数量吗？",
      "要是急的话也可以直接留电话，工程师尽快回您。",
    ].join("");
  }

  const primary = citations[0];
  return `${primary?.snippet ?? "我先帮您捋一下查到的情况。"}您这边还想确认参数、报价还是交期？跟我说，我继续帮您往下推。`;
}

function buildAssistantSalesReply(input: {
  citations: Array<{ title: string; snippet: string }>;
  needsLeadCapture: boolean;
  coaching: string;
  degraded?: boolean;
}): string {
  if (input.citations.length === 0 || input.needsLeadCapture) {
    const prefix = input.degraded
      ? "智能助手这会儿有点忙，我先按现有资料跟您说："
      : "这块我手头资料写得不够细。";
    return [
      prefix,
      input.coaching,
      "您方便的话补充下产品类型、尺寸或数量；或者直接留个电话，工程师好联系您。",
    ].join("");
  }

  const primary = input.citations[0];
  const prefix = input.degraded ? "智能助手这会儿有点忙，我先按现有资料跟您说：" : "";
  return `${prefix}${primary?.snippet ?? "我这边查到一些相关信息。"}${input.coaching}`;
}

const LEAD_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_LEAD_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
]);
const ALLOWED_LEAD_ATTACHMENT_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".zip"];

function hasAllowedLeadAttachmentExtension(fileName: string): boolean {
  const normalized = fileName.trim().toLowerCase();
  return ALLOWED_LEAD_ATTACHMENT_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

function validateLeadAttachments(attachments: LeadSubmissionRequest["attachments"]): void {
  for (const attachment of attachments ?? []) {
    if (!attachment.fileName.trim()) {
      throw new ChatValidationError("Attachment file name is required.");
    }
    if (attachment.sizeBytes <= 0 || attachment.contentBytes.byteLength === 0) {
      throw new ChatValidationError(`Attachment "${attachment.fileName}" is empty.`);
    }
    if (attachment.sizeBytes > LEAD_ATTACHMENT_MAX_BYTES) {
      throw new ChatValidationError(
        `Attachment "${attachment.fileName}" exceeds the 10 MB limit.`,
      );
    }
    const fileType = attachment.fileType.trim().toLowerCase();
    if (
      fileType &&
      fileType !== "application/octet-stream" &&
      !ALLOWED_LEAD_ATTACHMENT_TYPES.has(fileType)
    ) {
      throw new ChatValidationError(
        `Attachment "${attachment.fileName}" has an unsupported file type.`,
      );
    }
    if (!hasAllowedLeadAttachmentExtension(attachment.fileName)) {
      throw new ChatValidationError(
        `Attachment "${attachment.fileName}" has an unsupported file extension.`,
      );
    }
  }
}

function mergeLeadFields(
  existing: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  const merged = { ...existing };
  const latestWinsKeys = new Set(["requirement", "drawingAttachment"]);
  for (const [key, value] of Object.entries(incoming)) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    if (latestWinsKeys.has(key) || !(key in merged) || !merged[key]?.trim()) {
      merged[key] = trimmed;
    }
  }
  return merged;
}

function buildLeadAttachmentSignature(input: {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  checksum?: string;
}): string {
  return [
    input.fileName.trim().toLowerCase(),
    input.fileType.trim().toLowerCase(),
    String(input.sizeBytes),
    input.checksum ?? "",
  ].join(":");
}

function mergeLeadAttachments(
  existing: LeadAttachmentRecord[],
  incoming: LeadAttachmentRecord[],
): LeadAttachmentRecord[] {
  const seen = new Set(existing.map((item) => buildLeadAttachmentSignature(item)));
  const merged = [...existing];
  for (const attachment of incoming) {
    const signature = buildLeadAttachmentSignature(attachment);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    merged.push(attachment);
  }
  return merged;
}

function isHighIntentSignal(input: {
  intent: string;
  llmIntent: IntentJudgeResult | null;
}): boolean {
  return (
    input.intent === "quote" ||
    input.intent === "delivery" ||
    input.intent === "customization" ||
    Boolean(input.llmIntent?.leadCaptureRecommended)
  );
}

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly ragRepository: RagRepository,
    private readonly ragService: RagService,
    private readonly documentStorage: DocumentStorage,
    private readonly llmChat: OpenAICompatibleChatClient | null = null,
  ) {}

  private async withRepositoryTransaction<T>(
    fn: (repository: ChatRepository) => Promise<T>,
  ): Promise<T> {
    const repository = this.repository as ChatRepository | TransactionalChatRepository;
    if ("withTransaction" in repository && typeof repository.withTransaction === "function") {
      return repository.withTransaction(fn);
    }
    return fn(this.repository);
  }

  private async evaluateConversationAi(input: {
    conversationId: string;
    requestMessage: string;
    workspaceId: string;
    bot: BotRecord;
  }): Promise<{
    retrieval: Awaited<ReturnType<RagService["search"]>> & {
      needsLeadCapture: boolean;
    };
    coaching: string;
    suggestedQuestions: string[];
    aiMeta: ConversationAiEvaluation;
  }> {
    const ruleIntent = detectConsultationIntent(input.requestMessage);
    const llmIntent = await judgeIntentWithLlm(this.llmChat, {
      message: input.requestMessage,
    });
    const intent =
      llmIntent && (ruleIntent === "general" || llmIntent.confidence >= 0.82)
        ? llmIntent.intent
        : ruleIntent;
    const retrievalQuery = buildRetrievalQuery(input.requestMessage);
    const baseRetrieval = applyLeadCaptureRules(
      await this.ragService.search({
        workspaceId: input.workspaceId,
        botId: input.bot.id,
        query: retrievalQuery,
      }),
      input.bot,
      input.requestMessage,
    );
    const retrieval =
      llmIntent?.leadCaptureRecommended && !baseRetrieval.needsLeadCapture
        ? { ...baseRetrieval, needsLeadCapture: true }
        : baseRetrieval;
    const productLine =
      llmIntent && llmIntent.productLine !== "general" && llmIntent.confidence >= 0.72
        ? llmIntent.productLine
        : inferProductLine({
            query: input.requestMessage,
            citations: retrieval.citations,
          });
    const suggestedQuestions = buildSuggestedQuestions({
      query: input.requestMessage,
      citations: retrieval.citations,
      needsLeadCapture: retrieval.needsLeadCapture,
      intent,
      productLine,
    });
    const coaching = buildLeadCaptureCoaching({
      intent,
      productLine,
      missingFields: llmIntent?.missingFields,
    });
    const existingMeta =
      (await this.repository.getConversationMeta(input.conversationId)) ?? {};
    const existingLead = await this.repository.findLeadByConversation(input.conversationId);
    const highIntentTurnCount = isHighIntentSignal({ intent, llmIntent })
      ? (existingMeta.aiHighIntentTurnCount ?? 0) + 1
      : 0;
    const rawNeedsLeadCapture =
      !existingLead &&
      (retrieval.needsLeadCapture || highIntentTurnCount >= 2);
    const effectiveNeedsLeadCapture = shouldPromptLeadCapture({
      needsLeadCapture: rawNeedsLeadCapture,
      existingLead: Boolean(existingLead),
      lastLeadPromptAt: existingMeta.aiLastLeadPromptAt,
      highIntentTurnCount,
      now: Date.now(),
    });
    const evaluatedAt = new Date().toISOString();

    await this.repository.upsertConversationMeta(input.conversationId, {
      aiIntent: intent,
      aiProductLine: productLine,
      aiConfidence: llmIntent?.confidence ?? null,
      aiMissingFields: llmIntent?.missingFields ?? [],
      aiLeadCaptureRecommended: llmIntent?.leadCaptureRecommended ?? retrieval.needsLeadCapture,
      aiSuggestedQuestions: suggestedQuestions,
      aiHighIntentTurnCount: highIntentTurnCount,
      aiLastEvaluatedAt: evaluatedAt,
      ...(effectiveNeedsLeadCapture
        ? { aiLastLeadPromptAt: evaluatedAt }
        : {}),
    });

    return {
      retrieval: {
        ...retrieval,
        needsLeadCapture: effectiveNeedsLeadCapture,
      },
      coaching,
      suggestedQuestions,
      aiMeta: {
        intent,
        productLine,
        confidence: llmIntent?.confidence ?? null,
        missingFields: llmIntent?.missingFields ?? [],
        leadCaptureRecommended: llmIntent?.leadCaptureRecommended ?? retrieval.needsLeadCapture,
        suggestedQuestions,
        highIntentTurnCount,
        effectiveNeedsLeadCapture,
        evaluatedAt,
      },
    };
  }

  async createSite(input: {
    workspaceId: string;
    botId: string;
    name: string;
    allowedDomains: string[];
    status?: SiteRecord["status"];
    actorUserId?: string | null;
    siteKey?: string;
  }): Promise<SiteSecretRecord> {
    let botId = input.botId;
    if (!botId) {
      const bots = await this.ragRepository.listBotsByWorkspace(input.workspaceId);
      const activeBot = bots.find((b) => b.status === "active");
      if (!activeBot) {
        throw new ChatAccessError("No active bot found in workspace.", "BOT_DISABLED");
      }
      botId = activeBot.id;
    }
    const bot = await this.requireBot(input.workspaceId, botId);
    const revealedSiteKey = input.siteKey ?? generateSiteKey();
    const site: SiteRecord = {
      id: `site_${randomUUID()}`,
      workspaceId: input.workspaceId,
      botId: bot.id,
      name: input.name.trim(),
      siteKeyPrefix: siteKeyPrefix(revealedSiteKey),
      allowedDomains: input.allowedDomains,
      status: input.status ?? "active",
    };

    const created = await this.repository.createSite(site, {
      siteKey: revealedSiteKey,
      siteKeyHash: hashSiteKey(revealedSiteKey),
    });
    await this.repository.createSiteKeyAudit({
      id: `site_key_audit_${randomUUID()}`,
      siteId: created.id,
      workspaceId: created.workspaceId,
      actorUserId: input.actorUserId ?? null,
      action: "created",
      siteKeyPrefix: created.siteKeyPrefix,
      createdAt: new Date().toISOString(),
    });
    return {
      site: created,
      revealedSiteKey,
    };
  }

  async listSites(workspaceId: string): Promise<SiteRecord[]> {
    return this.repository.listSitesByWorkspace(workspaceId);
  }

  async checkSiteInstall(workspaceId: string, siteId: string) {
    const site = (await this.repository.listSitesByWorkspace(workspaceId)).find((item) => item.id === siteId);
    if (!site) throw new ChatAccessError("Site not found in workspace.");
    const conversations = await this.repository.listConversationsByWorkspace(workspaceId);
    const matching = conversations.filter((conversation) => {
      if (conversation.botId !== site.botId) return false;
      try {
        const host = new URL(conversation.origin).hostname.toLowerCase();
        return site.allowedDomains.some((domain) => host === domain.toLowerCase() || host.endsWith(`.${domain.toLowerCase()}`));
      } catch { return false; }
    }).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return {
      siteId: site.id,
      status: site.status,
      installed: matching.length > 0,
      verifiedBy: matching.length > 0 ? "widget_request" : "none",
      lastSeenAt: matching[0]?.createdAt ?? null,
      allowedDomains: site.allowedDomains,
      siteKeyPrefix: site.siteKeyPrefix,
    };
  }

  async rotateSiteKey(
    workspaceId: string,
    siteId: string,
    actorUserId?: string | null,
  ): Promise<SiteSecretRecord> {
    const sites = await this.repository.listSitesByWorkspace(workspaceId);
    const site = sites.find((item) => item.id === siteId);
    if (!site) {
      throw new ChatAccessError("Site not found in workspace.");
    }

    const revealedSiteKey = generateSiteKey();
    const rotated = await this.repository.rotateSiteKey(siteId, {
      siteKey: revealedSiteKey,
      siteKeyHash: hashSiteKey(revealedSiteKey),
      siteKeyPrefix: siteKeyPrefix(revealedSiteKey),
    });
    if (!rotated) {
      throw new ChatAccessError("Site not found in workspace.");
    }
    await this.repository.createSiteKeyAudit({
      id: `site_key_audit_${randomUUID()}`,
      siteId: rotated.id,
      workspaceId: rotated.workspaceId,
      actorUserId: actorUserId ?? null,
      action: "rotated",
      siteKeyPrefix: rotated.siteKeyPrefix,
      createdAt: new Date().toISOString(),
    });
    return {
      site: rotated,
      revealedSiteKey,
    };
  }

  async testSiteMessage(
    workspaceId: string,
    siteId: string,
    input: { origin: string; message: string },
  ): Promise<
    | { ok: true; reply: string; latencyMs: number }
    | { ok: false; code: 403 | 400; message: string }
  > {
    const sites = await this.repository.listSitesByWorkspace(workspaceId);
    const site = sites.find((item) => item.id === siteId);
    if (!site) {
      return { ok: false, code: 403, message: "Site not found in workspace." };
    }

    const message = input.message.trim();
    if (!message) {
      return { ok: false, code: 400, message: "Message is required." };
    }

    const origin = input.origin.includes("://")
      ? input.origin
      : `https://${input.origin}`;

    const startedAt = Date.now();
    try {
      const result = await this.streamForSite(site, {
        botId: site.botId,
        siteKey: "test-mode",
        visitorId: `test_${randomUUID()}`,
        sdkVersion: "1.0.0",
        origin,
        message,
      });
      return {
        ok: true,
        reply: result.assistantMessage.content,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof ChatValidationError) {
        return { ok: false, code: 400, message: error.message };
      }
      if (error instanceof ChatAccessError || error instanceof ChatRateLimitError) {
        return { ok: false, code: 403, message: error.message };
      }
      throw error;
    }
  }

  async updateSite(
    workspaceId: string,
    siteId: string,
    patch: {
      allowedDomains?: string[];
      name?: string;
      status?: SiteRecord["status"];
    },
  ): Promise<SiteRecord> {
    const sites = await this.repository.listSitesByWorkspace(workspaceId);
    const site = sites.find((item) => item.id === siteId);
    if (!site) {
      throw new ChatAccessError("Site not found in workspace.");
    }

    return this.repository.updateSite({
      ...site,
      name: patch.name?.trim() ?? site.name,
      status: patch.status ?? site.status,
      allowedDomains: patch.allowedDomains ?? site.allowedDomains,
    });
  }

  async deleteSite(workspaceId: string, siteId: string): Promise<boolean> {
    const sites = await this.repository.listSitesByWorkspace(workspaceId);
    const site = sites.find((item) => item.id === siteId);
    if (!site) {
      throw new ChatAccessError("Site not found in workspace.");
    }
    return this.repository.deleteSite(workspaceId, siteId);
  }

  async getPreviewSite(
    workspaceId: string,
    botId: string,
  ): Promise<SiteRecord | null> {
    return this.repository.findSiteByBotId(workspaceId, botId);
  }

  async getPublicWidgetConfig(input: {
    botId: string;
    siteKey: string;
    origin: string;
  }): Promise<PublicWidgetConfig> {
    const site = await this.requireSite(input.siteKey);
    // 公开读路径不经 WorkspaceAuthGuard，需在此显式注入租户上下文供 RLS 使用。
    enterWithTenant(site.workspaceId);
    const bot = await this.ragRepository.findBotById(site.workspaceId, input.botId);

    if (!bot || bot.workspaceId !== site.workspaceId || site.botId !== bot.id) {
      throw new ChatAccessError("Bot not found or inactive.", "UNAUTHORIZED");
    }

    if (!originAllowed(input.origin, site.allowedDomains)) {
      throw new ChatAccessError("当前域名未授权。", "DOMAIN_NOT_ALLOWED");
    }

    if (bot.status !== "active") {
      throw new ChatAccessError("Bot not found or inactive.", "BOT_DISABLED");
    }

    return {
      botId: bot.id,
      botName: bot.name,
      welcomeMessage: bot.welcomeMessage,
      recommendedQuestions: bot.recommendedQuestions,
    };
  }

  async stream(request: ChatStreamRequest): Promise<{
    conversation: ConversationRecord;
    userMessage: MessageRecord;
    assistantMessage: MessageRecord;
    events: ChatStreamEvent[];
  }> {
    const site = await this.requireSite(request.siteKey);
    return this.streamForSite(site, request);
  }

  private async streamForSite(
    site: SiteRecord,
    request: ChatStreamRequest,
  ): Promise<{
    conversation: ConversationRecord;
    userMessage: MessageRecord;
    assistantMessage: MessageRecord;
    events: ChatStreamEvent[];
  }> {
    const bot = await this.requireBot(site.workspaceId, request.botId);

    if (site.botId !== bot.id) {
      throw new ChatAccessError("Site does not belong to bot.");
    }

    if (!originAllowed(request.origin, site.allowedDomains)) {
      throw new ChatAccessError("当前域名未授权。", "DOMAIN_NOT_ALLOWED");
    }

    if (!request.message.trim()) {
      throw new ChatValidationError("Message is required.");
    }

    const rate = checkNamedRateLimit(
      "public.chat.ip",
      `${site.workspaceId}:${bot.id}:${request.visitorId}`,
      {
        limit: Math.max(1, bot.rateLimitPerMinute || 30),
      },
    );
    if (!rate.allowed) {
      throw new ChatRateLimitError(
        buildRateLimitMessage("public.chat.ip", rate.retryAfterSec),
        rate.retryAfterSec,
      );
    }

    const { conversation, userMessage } = await this.withRepositoryTransaction(
      async (repository) => {
        const conversation = await this.resolveConversation(
          repository,
          site.workspaceId,
          bot.id,
          request,
        );
        const now = new Date().toISOString();
        const userMessage = await repository.createMessage({
          id: `msg_${randomUUID()}`,
          workspaceId: site.workspaceId,
          botId: bot.id,
          conversationId: conversation.id,
          role: "user",
          content: request.message.trim(),
          createdAt: now,
        });
        return { conversation, userMessage };
      },
    );

    const { retrieval, coaching, suggestedQuestions } =
      await this.evaluateConversationAi({
        conversationId: conversation.id,
        requestMessage: request.message,
        workspaceId: site.workspaceId,
        bot,
      });

    const useLlm =
      this.llmChat !== null &&
      !(retrieval.needsLeadCapture && retrieval.citations.length === 0);

    let assistantReply = "";
    const tokenEvents: ChatStreamEvent[] = [];

    if (useLlm && this.llmChat) {
      const priorMessages = (
        await this.repository.listMessagesByConversation(conversation.id)
      )
        .filter((message) => message.id !== userMessage.id)
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const messages = buildChatMessages({
        botSystemPrompt: bot.systemPrompt,
        contextBlocks: retrieval.contextBlocks.map(sanitizeContextBlock),
        history: priorMessages,
        userMessage: userMessage.content,
      });

      try {
        let tokenIndex = 0;
        for await (const delta of this.llmChat.streamTokens({
          messages,
          temperature: bot.llmTemperature,
          maxTokens: bot.maxOutputTokens,
        })) {
          assistantReply += delta;
          tokenEvents.push({
            event: "token",
            data: { text: delta, index: tokenIndex },
          });
          tokenIndex += 1;
        }
      } catch {
        assistantReply = "";
        tokenEvents.length = 0;
      }
    }

    if (!assistantReply.trim()) {
      assistantReply = buildAssistantSalesReply({
        citations: retrieval.citations,
        needsLeadCapture: retrieval.needsLeadCapture,
        coaching,
        degraded: useLlm,
      });
      tokenEvents.length = 0;
      tokenEvents.push(
        ...splitIntoTokens(assistantReply).map((token, index) => ({
          event: "token" as const,
          data: { text: token, index },
        })),
      );
    }

    assistantReply = sanitizeVisitorFacingReply(assistantReply);
    tokenEvents.length = 0;
    tokenEvents.push(
      ...splitIntoTokens(assistantReply).map((token, index) => ({
        event: "token" as const,
        data: { text: token, index },
      })),
    );

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
      buildChatMetaEvent(bot, conversation, request),
      {
        event: "retrieval",
        data: {
          citationCount: retrieval.citations.length,
          retrievalScore: retrieval.retrievalScore,
          needsLeadCapture: retrieval.needsLeadCapture,
        },
      },
      ...tokenEvents,
      {
        event: "citations",
        data: { items: retrieval.citations },
      },
      {
        event: "done",
        data: {
          needsLeadCapture: retrieval.needsLeadCapture,
          messageId: assistantMessage.id,
          content: assistantReply,
          leadFields: bot.leadFields,
          suggestedQuestions,
        },
      },
    ];

    return { conversation, userMessage, assistantMessage, events };
  }

  async *streamLive(request: ChatStreamRequest): AsyncGenerator<ChatStreamEvent> {
    const site = await this.requireSite(request.siteKey);
    // 公开写路径不经 WorkspaceAuthGuard，需在此显式注入租户上下文供 RLS 使用。
    enterWithTenant(site.workspaceId);
    const bot = await this.requireBot(site.workspaceId, request.botId);

    if (site.botId !== bot.id) {
      throw new ChatAccessError("Site does not belong to bot.");
    }

    if (!originAllowed(request.origin, site.allowedDomains)) {
      throw new ChatAccessError("当前域名未授权。", "DOMAIN_NOT_ALLOWED");
    }

    if (!request.message.trim()) {
      throw new ChatValidationError("Message is required.");
    }

    const rate = checkNamedRateLimit(
      "public.chat.ip",
      `${site.workspaceId}:${bot.id}:${request.visitorId}`,
      {
        limit: Math.max(1, bot.rateLimitPerMinute || 30),
      },
    );
    if (!rate.allowed) {
      throw new ChatRateLimitError(
        buildRateLimitMessage("public.chat.ip", rate.retryAfterSec),
        rate.retryAfterSec,
      );
    }

    const { conversation, userMessage } = await this.withRepositoryTransaction(
      async (repository) => {
        const conversation = await this.resolveConversation(
          repository,
          site.workspaceId,
          bot.id,
          request,
        );
        const now = new Date().toISOString();
        const userMessage = await repository.createMessage({
          id: `msg_${randomUUID()}`,
          workspaceId: site.workspaceId,
          botId: bot.id,
          conversationId: conversation.id,
          role: "user",
          content: request.message.trim(),
          createdAt: now,
        });
        return { conversation, userMessage };
      },
    );

    const { retrieval, coaching, suggestedQuestions } =
      await this.evaluateConversationAi({
        conversationId: conversation.id,
        requestMessage: request.message,
        workspaceId: site.workspaceId,
        bot,
      });

    yield buildChatMetaEvent(bot, conversation, request);
    yield {
      event: "retrieval",
      data: {
        citationCount: retrieval.citations.length,
        retrievalScore: retrieval.retrievalScore,
        needsLeadCapture: retrieval.needsLeadCapture,
      },
    };

    const useLlm =
      this.llmChat !== null &&
      !(retrieval.needsLeadCapture && retrieval.citations.length === 0);

    let assistantReply = "";
    const tokenEvents: ChatStreamEvent[] = [];

    if (useLlm && this.llmChat) {
      const priorMessages = (
        await this.repository.listMessagesByConversation(conversation.id)
      )
        .filter((message) => message.id !== userMessage.id)
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const messages = buildChatMessages({
        botSystemPrompt: bot.systemPrompt,
        contextBlocks: retrieval.contextBlocks.map(sanitizeContextBlock),
        history: priorMessages,
        userMessage: userMessage.content,
      });

      try {
        let tokenIndex = 0;
        for await (const delta of this.llmChat.streamTokens({
          messages,
          temperature: bot.llmTemperature,
          maxTokens: bot.maxOutputTokens,
        })) {
          assistantReply += delta;
          tokenEvents.push({
            event: "token",
            data: { text: delta, index: tokenIndex },
          });
          tokenIndex += 1;
        }
      } catch {
        yield {
          event: "error",
          data: {
            code: "PROVIDER_ERROR",
            message: "模型服务暂时不可用，已切换为基础回复。",
          },
        };
        assistantReply = "";
        tokenEvents.length = 0;
      }
    }

    if (!assistantReply.trim()) {
      assistantReply = buildAssistantSalesReply({
        citations: retrieval.citations,
        needsLeadCapture: retrieval.needsLeadCapture,
        coaching,
        degraded: useLlm,
      });
      let tokenIndex = 0;
      tokenEvents.length = 0;
      for (const token of splitIntoTokens(assistantReply)) {
        tokenEvents.push({
          event: "token",
          data: { text: token, index: tokenIndex },
        });
        tokenIndex += 1;
      }
    }

    assistantReply = sanitizeVisitorFacingReply(assistantReply);
    tokenEvents.length = 0;
    tokenEvents.push(
      ...splitIntoTokens(assistantReply).map((token, index) => ({
        event: "token" as const,
        data: { text: token, index },
      })),
    );

    const assistantMessage = await this.repository.createMessage({
      id: `msg_${randomUUID()}`,
      workspaceId: site.workspaceId,
      botId: bot.id,
      conversationId: conversation.id,
      role: "assistant",
      content: assistantReply,
      createdAt: new Date().toISOString(),
    });

    yield {
      event: "citations",
      data: { items: retrieval.citations },
    };
    for (const event of tokenEvents) {
      yield event;
    }
    yield {
      event: "done",
      data: {
        needsLeadCapture: retrieval.needsLeadCapture,
        messageId: assistantMessage.id,
        content: assistantReply,
        leadFields: bot.leadFields,
        suggestedQuestions,
      },
    };
  }

  async submitLead(request: LeadSubmissionRequest): Promise<LeadRecord> {
    const site = await this.requireSite(request.siteKey);
    // 公开写路径不经 WorkspaceAuthGuard，需在此显式注入租户上下文供 RLS 使用。
    enterWithTenant(site.workspaceId);
    const bot = await this.requireBot(site.workspaceId, request.botId);

    if (site.botId !== bot.id) {
      throw new ChatAccessError("Site does not belong to bot.");
    }

    const requestOrigin = request.origin ?? "";
    if (
      requestOrigin &&
      site.allowedDomains.length > 0 &&
      !originAllowed(requestOrigin, site.allowedDomains)
    ) {
      throw new ChatAccessError("当前域名未授权。", "DOMAIN_NOT_ALLOWED");
    }

    const conversation = await this.repository.findConversationById(
      site.workspaceId,
      request.conversationId,
    );
    if (
      !conversation ||
      conversation.workspaceId !== site.workspaceId ||
      conversation.botId !== bot.id
    ) {
      throw new ChatAccessError("Conversation not found in workspace.");
    }

    const fields = Object.fromEntries(
      Object.entries(request.fields).map(([key, value]) => [key, value.trim()]),
    );
    const existingLead = await this.repository.findLeadByConversation(conversation.id);
    const validationFields = existingLead
      ? mergeLeadFields(existingLead.fields, fields)
      : fields;

    try {
      validateLeadFields(bot.leadFields, validationFields);
    } catch (error) {
      throw new ChatValidationError(normalizeLeadFieldError(error));
    }
    validateLeadAttachments(request.attachments);

    const messages = await this.repository.listMessagesByConversation(conversation.id);
    const keyQuestion = extractKeyQuestion(messages);
    const summary = buildSessionSummary(messages);
    const attachments = await this.saveLeadAttachments(
      site.workspaceId,
      conversation.id,
      request.attachments ?? [],
    );
    const pendingAttachments = await this.resolvePendingAttachments(
      site.workspaceId,
      request.pendingAttachmentIds ?? [],
    );
    const allAttachments = [...attachments, ...pendingAttachments];

    return this.withRepositoryTransaction(async (repository) => {
      const currentLead = existingLead ?? (await repository.findLeadByConversation(conversation.id));
      if (currentLead) {
        const mergedLead: LeadRecord = {
          ...currentLead,
          fields: mergeLeadFields(currentLead.fields, fields),
          attachments: mergeLeadAttachments(
            currentLead.attachments,
            allAttachments.map((attachment) => ({
              ...attachment,
              leadId: currentLead.id,
            })),
          ),
          keyQuestion: currentLead.keyQuestion ?? keyQuestion,
          summary: summary ?? currentLead.summary,
          sourceSiteId: currentLead.sourceSiteId ?? site.id,
          sourceSiteName: currentLead.sourceSiteName ?? site.name,
        };
        await repository.updateLead(mergedLead);
        return mergedLead;
      }

      const leadId = `lead_${randomUUID()}`;
      const lead = await repository.createLead({
        id: leadId,
        workspaceId: site.workspaceId,
        botId: bot.id,
        conversationId: conversation.id,
        siteKey: request.siteKey,
        fields,
        createdAt: new Date().toISOString(),
        attachments: allAttachments.map((attachment) => ({
          ...attachment,
          leadId,
        })),
        keyQuestion,
        summary,
        sourceSiteId: site.id,
        sourceSiteName: site.name,
      });

      await repository.upsertLeadMeta({
        leadId: lead.id,
        status: "new",
        assignee: null,
        notes: "",
        updatedAt: lead.createdAt,
        followUpRecords: createInitialLeadFollowUpRecords(lead.id, lead.createdAt),
      });
      await repository.upsertConversationMeta(conversation.id, {
        aiHighIntentTurnCount: 0,
      });

      return lead;
    });
  }

  /**
   * Console-side lead creation (manual entry, no conversation/site required).
   */
  async createLeadConsole(
    workspaceId: string,
    input: { name: string; contact?: string; sourceBot?: string; lastQuestion?: string },
  ): Promise<LeadRecord> {
    const bots = await this.ragRepository.listBotsByWorkspace(workspaceId);
    const bot = bots[0];
    if (!bot) {
      throw new ChatValidationError("请先创建至少一个 AI 助手，再手动添加线索。");
    }

    const leadId = `lead_${randomUUID()}`;
    const conversationId = `manual_${randomUUID()}`;
    const now = new Date().toISOString();
    const fields: Record<string, string> = { name: input.name };
    if (input.contact) fields.contact = input.contact;
    if (input.sourceBot) fields.sourceBot = input.sourceBot;

    await this.repository.createConversation({
      id: conversationId,
      workspaceId,
      botId: bot.id,
      visitorId: `manual_visitor_${leadId}`,
      origin: "console_manual",
      createdAt: now,
    });

    const lead: LeadRecord = {
      id: leadId,
      workspaceId,
      botId: bot.id,
      conversationId,
      siteKey: "manual",
      fields,
      createdAt: now,
      attachments: [],
      keyQuestion: input.lastQuestion ?? null,
      summary: null,
      sourceSiteId: null,
      sourceSiteName: "手动创建",
    };
    const created = await this.repository.createLead(lead);
    await this.repository.upsertLeadMeta({
      leadId: created.id,
      status: "new",
      assignee: null,
      notes: "",
      updatedAt: now,
      followUpRecords: createInitialLeadFollowUpRecords(created.id, now),
    });
    return created;
  }

  async listConversations(
    workspaceId: string,
    options?: ConversationListQuery,
  ): Promise<{
    items: ConversationSummary[];
    nextCursor: string | null;
  }> {
    const page = options?.limit
      ? await this.repository.listConversationsPage(workspaceId, options)
      : {
          items: await this.repository.listConversationsByWorkspace(workspaceId),
          nextCursor: null,
        };

    const output: ConversationSummary[] = [];

    for (const conversation of page.items) {
      const messages = await this.repository.listMessagesByConversation(
        conversation.id,
      );
      const lastMessage = messages.at(-1) ?? null;

      output.push({
        ...conversation,
        lastMessagePreview: lastMessage?.content.slice(0, 80) ?? null,
        messageCount: messages.length,
      });
    }

    return { items: output, nextCursor: page.nextCursor };
  }

  async getConversation(
    workspaceId: string,
    conversationId: string,
  ): Promise<ConversationDetail> {
    const conversation = await this.repository.findConversationById(
      workspaceId,
      conversationId,
    );

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

  async listLeads(workspaceId: string): Promise<
    Array<{
      lead: LeadRecord;
      meta: LeadMetaRecord | null;
      conversation: ConversationRecord | null;
      bot: BotRecord | null;
      messages: MessageRecord[];
    }>
  > {
    const leads = await this.repository.listLeadsByWorkspace(workspaceId);
    const output: Array<{
      lead: LeadRecord;
      meta: LeadMetaRecord | null;
      conversation: ConversationRecord | null;
      bot: BotRecord | null;
      messages: MessageRecord[];
    }> = [];

    for (const lead of leads) {
      const conversation = await this.repository.findConversationById(
        workspaceId,
        lead.conversationId,
      );
      const messages = await this.repository.listMessagesByConversation(
        lead.conversationId,
      );

      output.push({
        lead,
        meta: await this.repository.getLeadMeta(lead.id),
        conversation,
        bot: await this.ragRepository.findBotById(workspaceId, lead.botId),
        messages,
      });
    }

    return output;
  }

  async getLead(
    workspaceId: string,
    leadId: string,
  ): Promise<{
    lead: LeadRecord;
    meta: LeadMetaRecord | null;
    conversation: ConversationRecord | null;
    bot: BotRecord | null;
    messages: MessageRecord[];
  }> {
    const lead = await this.repository.findLeadById(workspaceId, leadId);
    if (!lead || lead.workspaceId !== workspaceId) {
      throw new ChatAccessError("Lead not found in workspace.");
    }

    const conversation = await this.repository.findConversationById(
      workspaceId,
      lead.conversationId,
    );
    const messages = await this.repository.listMessagesByConversation(lead.conversationId);

    return {
      lead,
      meta: await this.repository.getLeadMeta(lead.id),
      conversation,
      bot: await this.ragRepository.findBotById(workspaceId, lead.botId),
      messages,
    };
  }

  async updateLead(
    workspaceId: string,
    leadId: string,
    patch: {
      status?: LeadMetaRecord["status"];
      assignee?: string | null;
      notes?: string;
    },
    actorUserId?: string | null,
  ): Promise<LeadMetaRecord> {
    const lead = await this.repository.findLeadById(workspaceId, leadId);
    if (!lead || lead.workspaceId !== workspaceId) {
      throw new ChatAccessError("Lead not found in workspace.");
    }

    const current = await this.repository.getLeadMeta(leadId);
    const updatedAt = new Date().toISOString();
    const next = {
      status:
        patch.status === undefined
          ? (current?.status ?? "new")
          : normalizeLeadStatusInput(patch.status),
      assignee:
        patch.assignee === undefined ? (current?.assignee ?? null) : patch.assignee,
      notes: patch.notes ?? current?.notes ?? "",
    };
    const followUpChanges = buildLeadMetaFollowUpChanges({
      leadId,
      previous: current,
      next,
      updatedAt,
      actor: actorUserId ?? "workspace",
    });

    return this.repository.upsertLeadMeta({
      leadId,
      status: next.status,
      assignee: next.assignee,
      notes: next.notes,
      updatedAt,
      followUpRecords: appendLeadFollowUpRecords(
        current?.followUpRecords,
        followUpChanges,
      ),
    });
  }

  async readLeadAttachment(
    workspaceId: string,
    leadId: string,
    attachmentId: string,
  ): Promise<{
    attachment: LeadAttachmentRecord;
    contentBytes: Uint8Array;
  }> {
    const lead = await this.repository.findLeadById(workspaceId, leadId);
    if (!lead || lead.workspaceId !== workspaceId) {
      throw new ChatAccessError("Lead not found in workspace.");
    }

    const attachment = lead.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      throw new ChatAccessError("Lead attachment not found in workspace.");
    }

    if (attachment.status === "failed" || !attachment.storageKey) {
      throw new ChatValidationError(
        attachment.errorMessage ?? "Attachment upload failed and cannot be downloaded.",
      );
    }

    return {
      attachment,
      contentBytes: await this.documentStorage.read(attachment.storageKey, workspaceId),
    };
  }

  private async resolveConversation(
    repository: ChatRepository,
    workspaceId: string,
    botId: string,
    request: ChatStreamRequest,
  ): Promise<ConversationRecord> {
    if (request.conversationId) {
      const existing = await repository.findConversationById(
        workspaceId,
        request.conversationId,
      );
      if (
        existing &&
        existing.workspaceId === workspaceId &&
        existing.botId === botId &&
        existing.visitorId === request.visitorId
      ) {
        return existing;
      }

      throw new ChatAccessError("Conversation not found in workspace.");
    }

    return repository.createConversation({
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
      throw new ChatAccessError("Site not found or inactive.", "UNAUTHORIZED");
    }

    return site;
  }

  private async requireBot(workspaceId: string, botId: string): Promise<BotRecord> {
    const bot = await this.ragRepository.findBotById(workspaceId, botId);

    if (!bot || bot.workspaceId !== workspaceId || bot.status !== "active") {
      throw new ChatAccessError("Bot not found or inactive.", "BOT_DISABLED");
    }

    return bot;
  }

  private async saveLeadAttachments(
    workspaceId: string,
    conversationId: string,
    uploads: NonNullable<LeadSubmissionRequest["attachments"]>,
  ): Promise<LeadAttachmentRecord[]> {
    if (uploads.length === 0) {
      return [];
    }

    const createdAt = new Date().toISOString();
    const attachments: LeadAttachmentRecord[] = [];

    for (const upload of uploads) {
      const checksum = createHash("sha256")
        .update(upload.contentBytes)
        .digest("hex");
      try {
        const stored = await this.documentStorage.save({
          workspaceId,
          knowledgeBaseId: `lead-attachments-${conversationId}`,
          fileName: upload.fileName,
          contentBytes: upload.contentBytes,
        });
        attachments.push({
          id: `lead_attachment_${randomUUID()}`,
          leadId: "",
          fileName: upload.fileName,
          fileType: upload.fileType,
          sizeBytes: stored.sizeBytes,
          storageKey: stored.storageKey,
          checksum,
          createdAt,
          status: "ready",
        });
      } catch (error) {
        attachments.push({
          id: `lead_attachment_${randomUUID()}`,
          leadId: "",
          fileName: upload.fileName,
          fileType: upload.fileType,
          sizeBytes: upload.sizeBytes,
          storageKey: "",
          checksum,
          createdAt,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Attachment upload failed.",
        });
      }
    }

    return attachments;
  }

  /**
   * Widget 预上传线索附件：先存对象存储，再在 pending 表暂存元数据，返回可引用的 id 与公开下载地址。
   * 建线索时通过 LeadSubmissionRequest.pendingAttachmentIds 引用，随后被消费删除。
   */
  async uploadPendingLeadAttachment(input: {
    botId: string;
    siteKey: string;
    fileName: string;
    fileType: string;
    contentBytes: Uint8Array;
    expiresInMs?: number;
  }  ): Promise<PendingLeadAttachmentRef> {
    const site = await this.requireSite(input.siteKey);
    // 公开写路径不经 WorkspaceAuthGuard，需在此显式注入租户上下文供 RLS 使用。
    enterWithTenant(site.workspaceId);
    const bot = await this.requireBot(site.workspaceId, input.botId);
    if (site.botId !== bot.id) {
      throw new ChatAccessError("Site does not belong to bot.");
    }

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + (input.expiresInMs ?? 24 * 60 * 60 * 1000),
    ).toISOString();
    const checksum = createHash("sha256").update(input.contentBytes).digest("hex");

    const stored = await this.documentStorage.save({
      workspaceId: site.workspaceId,
      knowledgeBaseId: "pending-lead-attachments",
      fileName: input.fileName,
      contentBytes: input.contentBytes,
    });

    const id = `plead_att_${randomUUID()}`;
    const record: PendingLeadAttachment = {
      id,
      workspaceId: site.workspaceId,
      siteKey: input.siteKey,
      fileName: input.fileName,
      fileType: input.fileType || "application/octet-stream",
      sizeBytes: stored.sizeBytes,
      storageKey: stored.storageKey,
      checksum,
      createdAt,
      expiresAt,
    };
    await this.repository.createPendingLeadAttachment(record);

    return {
      id,
      fileName: record.fileName,
      fileType: record.fileType,
      sizeBytes: record.sizeBytes,
      downloadUrl: `/public/leads/attachments/${id}`,
    };
  }

  /** 将预上传附件引用解析为正式线索附件，并消费（删除）pending 记录；过期或不存在的会被跳过/清理。 */
  async resolvePendingAttachments(
    workspaceId: string,
    ids: string[],
  ): Promise<LeadAttachmentRecord[]> {
    const resolved: LeadAttachmentRecord[] = [];
    for (const id of ids) {
      const pending = await this.repository.findPendingLeadAttachment(workspaceId, id);
      if (!pending) continue;
      if (new Date(pending.expiresAt).getTime() < Date.now()) {
        await this.repository.deletePendingLeadAttachment(id);
        continue;
      }
      resolved.push({
        id: `lead_attachment_${randomUUID()}`,
        leadId: "",
        fileName: pending.fileName,
        fileType: pending.fileType,
        sizeBytes: pending.sizeBytes,
        storageKey: pending.storageKey,
        checksum: pending.checksum,
        createdAt: pending.createdAt,
        status: "ready",
      });
      await this.repository.deletePendingLeadAttachment(id);
    }
    return resolved;
  }

  async readPendingLeadAttachmentFile(
    workspaceId: string,
    id: string,
  ): Promise<{ attachment: PendingLeadAttachment; contentBytes: Uint8Array }> {
    const pending = await this.repository.findPendingLeadAttachment(workspaceId, id);
    if (!pending) {
      throw new ChatAccessError("Pending lead attachment not found.");
    }
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      await this.repository.deletePendingLeadAttachment(id);
      throw new ChatAccessError("Pending lead attachment expired.");
    }
    return {
      attachment: pending,
      contentBytes: await this.documentStorage.read(pending.storageKey, workspaceId),
    };
  }

  /** 公开下载预上传附件：pending id 为不可猜测的 UUID，作为安全边界，无需鉴权。 */
  async readPendingLeadAttachmentPublic(
    id: string,
  ): Promise<{ attachment: PendingLeadAttachment; contentBytes: Uint8Array }> {
    const pending = await this.repository.findPendingLeadAttachmentById(id);
    if (!pending) {
      throw new ChatAccessError("Pending lead attachment not found.");
    }
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      await this.repository.deletePendingLeadAttachment(id);
      throw new ChatAccessError("Pending lead attachment expired.");
    }
    return {
      attachment: pending,
      contentBytes: await this.documentStorage.read(pending.storageKey, pending.workspaceId),
    };
  }
}
