import { SDK_VERSION, type CitationItem, type StreamDonePayload, type WidgetConfig } from "./types";
import { consumeSseResponse } from "./sse-client";

export interface StreamChatInput {
  config: WidgetConfig;
  visitorId: string;
  conversationId?: string;
  message: string;
}

export interface StreamChatHandlers {
  onMeta: (conversationId: string) => void;
  onToken: (text: string) => void;
  onCitations?: (items: CitationItem[]) => void;
  onDone: (payload: StreamDonePayload) => void;
}

export async function streamPublicChat(
  input: StreamChatInput,
  handlers: StreamChatHandlers,
): Promise<void> {
  const response = await fetch(`${input.config.apiBase}/public/chat/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      botId: input.config.botId,
      siteKey: input.config.siteKey,
      visitorId: input.visitorId,
      conversationId: input.conversationId,
      sdkVersion: SDK_VERSION,
      origin: window.location.origin,
      message: input.message,
    }),
  });

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  let content = "";
  const citations: CitationItem[] = [];

  await consumeSseResponse(response, (event) => {
    if (event.event === "meta" && typeof event.data.conversationId === "string") {
      handlers.onMeta(event.data.conversationId);
    }
    if (event.event === "token" && typeof event.data.text === "string") {
      content += event.data.text;
      handlers.onToken(content);
    }
    if (event.event === "citations" && Array.isArray(event.data.items)) {
      citations.splice(0, citations.length, ...(event.data.items as CitationItem[]));
      handlers.onCitations?.([...citations]);
    }
    if (event.event === "done") {
      handlers.onDone(event.data as StreamDonePayload);
    }
    if (event.event === "error" && typeof event.data.message === "string") {
      throw new Error(event.data.message);
    }
  });
}
