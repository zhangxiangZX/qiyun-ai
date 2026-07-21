export const SDK_VERSION = "1.2.0";

export interface WidgetConfig {
  botId: string;
  siteKey: string;
  apiBase: string;
  title: string;
  welcome: string;
  accent: string;
  locale: "zh-CN" | "en";
}

export interface CitationItem {
  title?: string;
  documentTitle?: string;
  chunkId?: string;
  snippet?: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: CitationItem[];
  suggestedQuestions?: string[];
  status?: "streaming" | "done" | "error";
}

export type WidgetPanelState = "closed" | "open";

export type WidgetConnectionState = "idle" | "loading" | "streaming" | "error";

export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface StreamDonePayload {
  needsLeadCapture?: boolean;
  leadFields?: string[];
  messageId?: string;
  content?: string;
  suggestedQuestions?: string[];
  citations?: CitationItem[];
}
