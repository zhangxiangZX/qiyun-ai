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
  citations: Array<{ title: string; snippet: string }>;
  needsLeadCapture: boolean;
}

const API_PREFIX =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api";

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
  const response = await fetch(`${API_PREFIX}/public/chat/stream`, {
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
      origin: input.origin ?? (typeof window !== "undefined" ? window.location.origin : ""),
      message: input.message,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Chat request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const eventText = await response.text();
  const events = parseSseEvents(eventText);

  let conversationId = input.conversationId ?? "";
  let messageId = "";
  let content = "";
  let needsLeadCapture = false;
  const citations: Array<{ title: string; snippet: string }> = [];

  for (const event of events) {
    if (event.event === "meta") {
      conversationId = (event.data as { conversationId: string }).conversationId;
    }
    if (event.event === "token") {
      content += (event.data as { text: string }).text;
    }
    if (event.event === "citations") {
      const items = (event.data as { items: Array<{ title: string; snippet: string }> }).items;
      citations.push(...items);
    }
    if (event.event === "done") {
      const done = event.data as { messageId: string; needsLeadCapture: boolean };
      messageId = done.messageId;
      needsLeadCapture = done.needsLeadCapture;
    }
  }

  return { conversationId, messageId, content, citations, needsLeadCapture };
}
