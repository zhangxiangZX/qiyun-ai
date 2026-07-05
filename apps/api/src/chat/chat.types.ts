import type { RagCitation } from "../rag/rag.types";

export type LeadStatus =
  | "new"
  | "pending"
  | "contacted"
  | "proposal"
  | "won"
  | "invalid";

export interface LeadFollowUpRecord {
  id: string;
  kind: "note" | "status" | "assignee" | "system";
  title: string;
  body?: string;
  actor?: string | null;
  createdAt: string;
}

export interface SiteRecord {
  id: string;
  workspaceId: string;
  botId: string;
  name: string;
  siteKeyPrefix: string;
  allowedDomains: string[];
  status: "active" | "disabled";
}

export interface SiteSecretRecord {
  site: SiteRecord;
  revealedSiteKey: string;
}

export interface SiteKeyAuditRecord {
  id: string;
  siteId: string;
  workspaceId: string;
  actorUserId: string | null;
  action: "created" | "rotated";
  siteKeyPrefix: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  workspaceId: string;
  botId: string;
  visitorId: string;
  origin: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  workspaceId: string;
  botId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface LeadRecord {
  id: string;
  workspaceId: string;
  botId: string;
  conversationId: string;
  siteKey: string;
  fields: Record<string, string>;
  createdAt: string;
  attachments: LeadAttachmentRecord[];
  keyQuestion?: string | null;
  summary?: string | null;
  sourceSiteId?: string | null;
  sourceSiteName?: string | null;
}

export interface LeadAttachmentRecord {
  id: string;
  leadId: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  storageKey: string;
  checksum?: string;
  createdAt: string;
  status?: "ready" | "pending" | "failed";
  errorMessage?: string;
}

export interface LeadMetaRecord {
  leadId: string;
  status: LeadStatus;
  assignee: string | null;
  notes: string;
  updatedAt: string;
  followUpRecords?: LeadFollowUpRecord[];
}

export interface ChatStreamRequest {
  botId: string;
  siteKey: string;
  visitorId: string;
  conversationId?: string;
  sdkVersion: string;
  origin: string;
  message: string;
}

export interface LeadSubmissionRequest {
  botId: string;
  siteKey: string;
  conversationId: string;
  fields: Record<string, string>;
  attachments?: LeadAttachmentUpload[];
}

export interface LeadAttachmentUpload {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  contentBytes: Uint8Array;
}

export interface ChatMetaEvent {
  event: "meta";
  data: {
    conversationId: string;
    botId: string;
    visitorId: string;
    sdkVersion: string;
    welcomeMessage: string;
    recommendedQuestions: string[];
  };
}

export interface PublicWidgetConfig {
  botId: string;
  botName: string;
  welcomeMessage: string;
  recommendedQuestions: string[];
}

export interface ChatRetrievalEvent {
  event: "retrieval";
  data: {
    citationCount: number;
    retrievalScore: number | null;
    needsLeadCapture: boolean;
  };
}

export interface ChatTokenEvent {
  event: "token";
  data: { text: string; index: number };
}

export interface ChatCitationsEvent {
  event: "citations";
  data: { items: RagCitation[] };
}

export interface ChatDoneEvent {
  event: "done";
  data: {
    needsLeadCapture: boolean;
    messageId: string;
    content: string;
    leadFields?: string[];
    suggestedQuestions?: string[];
  };
}

export interface ChatErrorEvent {
  event: "error";
  data: {
    code: string;
    message: string;
  };
}

export type ChatStreamEvent =
  | ChatMetaEvent
  | ChatRetrievalEvent
  | ChatTokenEvent
  | ChatCitationsEvent
  | ChatDoneEvent
  | ChatErrorEvent;

export interface ConversationSummary {
  id: string;
  workspaceId: string;
  botId: string;
  visitorId: string;
  origin: string;
  createdAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageRecord[];
}
