export type ConversationStatus = "open" | "resolved" | "unresolved" | "pending";

export type MessageRole = "user" | "assistant" | "system";

export interface ConversationListItem {
  id: string;
  visitorLabel: string;
  summary: string;
  botId: string;
  botName: string;
  status: ConversationStatus;
  hasLead: boolean;
  highIntent: boolean;
  aiIntentLabel: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface MessageCitation {
  id: string;
  title: string;
  excerpt: string;
  score?: number;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  model?: string;
  tokenCount?: number;
  latencyMs?: number;
  citations?: MessageCitation[];
}

export interface ConversationLead {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  capturedAt: string;
}

export interface ConversationDetail extends ConversationListItem {
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
  messages: ConversationMessage[];
  lead: ConversationLead | null;
  channel: string;
  pageUrl: string;
}

export interface ConversationFilters {
  query: string;
  botId: string;
  hasLead: boolean | null;
  unresolvedOnly: boolean;
}

export interface BotFilterOption {
  id: string;
  name: string;
}

export interface ConversationPage {
  items: ConversationListItem[];
  nextCursor: string | null;
}
