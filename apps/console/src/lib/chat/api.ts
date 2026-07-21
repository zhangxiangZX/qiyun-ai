import { ApiError, normalizeApiErrorCode } from "@/lib/api/errors";
import { apiRequest, getApiPrefix } from "@/lib/api/client";
import { WORKSPACE_ID } from "@/lib/api/workspace";

export interface ChatStreamInput {
  botId: string;
  siteKey: string;
  visitorId: string;
  conversationId?: string;
  message: string;
  origin?: string;
}

export interface ChatStreamResult {
  conversationId: string;
  messageId: string;
  content: string;
  citations: Array<{ title: string; snippet: string; score?: number; chunkId?: string }>;
  needsLeadCapture: boolean;
}

export interface PreviewBotContext {
  botId: string;
  siteKey: string;
  origin: string;
}

function parseSseEvents(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    const eventLine = lines.find((line) => line.startsWith("event:"));
    const dataLine = lines.find((line) => line.startsWith("data:"));
    if (!eventLine || !dataLine) continue;

    events.push({
      event: eventLine.replace("event:", "").trim(),
      data: JSON.parse(dataLine.replace("data:", "").trim()),
    });
  }

  return events;
}

export async function streamChatMessage(input: ChatStreamInput): Promise<ChatStreamResult> {
  const response = await fetch(`${getApiPrefix()}/public/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": WORKSPACE_ID,
    },
    body: JSON.stringify({
      botId: input.botId,
      siteKey: input.siteKey,
      visitorId: input.visitorId,
      conversationId: input.conversationId,
      sdkVersion: "1.0.0",
      origin: input.origin ?? window.location.origin,
      message: input.message,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let code = normalizeApiErrorCode(response.status);
    let message = `Chat request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as { code?: string; message?: string };
      code = normalizeApiErrorCode(response.status, payload.code);
      if (payload.message) message = payload.message;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, code, message);
  }

  const eventText = await response.text();
  const events = parseSseEvents(eventText);

  let conversationId = input.conversationId ?? "";
  let messageId = "";
  let content = "";
  let needsLeadCapture = false;
  const citations: Array<{ title: string; snippet: string; score?: number; chunkId?: string }> = [];

  for (const event of events) {
    if (event.event === "meta") {
      conversationId = (event.data as { conversationId: string }).conversationId;
    }
    if (event.event === "token") {
      content += (event.data as { text: string }).text;
    }
    if (event.event === "citations") {
      const items = (
        event.data as {
          items: Array<{ title: string; snippet: string; score?: number; chunkId?: string }>;
        }
      ).items;
      citations.push(...items);
    }
    if (event.event === "done") {
      const done = event.data as {
        messageId: string;
        needsLeadCapture: boolean;
        content?: string;
      };
      messageId = done.messageId;
      needsLeadCapture = done.needsLeadCapture;
      if ((!content || !content.trim()) && done.content) {
        content = done.content;
      }
    }
    if (event.event === "error") {
      const err = event.data as { message?: string };
      throw new ApiError(502, "UPSTREAM_REQUIRED", err.message || "AI 回复失败，请稍后重试。");
    }
  }

  if (!content.trim()) {
    content = "抱歉，暂时无法基于当前知识库给出准确回答。您可以补充更多细节，或留下联系方式由工程师跟进。";
  }

  return { conversationId, messageId, content, citations, needsLeadCapture };
}

export async function syncPreviewBot(input: {
  botId: string;
  name: string;
  status: "enabled" | "disabled" | "draft";
  knowledgeBaseIds: string[];
}): Promise<PreviewBotContext> {
  return apiRequest<PreviewBotContext>(`/preview/bots/${input.botId}`, {
    method: "POST",
    body: {
      name: input.name,
      status: input.status,
      knowledgeBaseIds: input.knowledgeBaseIds,
    },
  });
}

export async function getPreviewBotContext(botId: string): Promise<PreviewBotContext> {
  return apiRequest<PreviewBotContext>(`/preview/bots/${botId}`);
}
