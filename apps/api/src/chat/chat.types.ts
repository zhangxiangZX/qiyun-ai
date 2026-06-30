import type { RagCitation } from "../rag/rag.types";

export interface SiteRecord {
  id: string;
  workspaceId: string;
  botId: string;
  name: string;
  siteKey: string;
  allowedDomains: string[];
  status: "active" | "disabled";
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
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
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

export interface ChatMetaEvent {
  event: "meta";
  data: {
    conversationId: string;
  };
}

export interface ChatTokenEvent {
  event: "token";
  data: {
    text: string;
  };
}

export interface ChatCitationsEvent {
  event: "citations";
  data: {
    items: RagCitation[];
  };
}

export interface ChatDoneEvent {
  event: "done";
  data: {
    needsLeadCapture: boolean;
    messageId: string;
  };
}

export type ChatStreamEvent =
  | ChatMetaEvent
  | ChatTokenEvent
  | ChatCitationsEvent
  | ChatDoneEvent;
