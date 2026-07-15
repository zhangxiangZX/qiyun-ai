import type { ChatMessage } from "./types";

const SESSION_PREFIX = "qiyun_widget_session_";
const MAX_MESSAGES = 40;

export interface WidgetSession {
  conversationId: string;
  messages: ChatMessage[];
  updatedAt: number;
}

function storageKey(botId: string): string {
  return `${SESSION_PREFIX}${botId}`;
}

export function loadWidgetSession(botId: string): WidgetSession | null {
  try {
    const raw = localStorage.getItem(storageKey(botId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as WidgetSession;
    if (!parsed || typeof parsed.conversationId !== "string" || !Array.isArray(parsed.messages)) {
      return null;
    }

    return {
      conversationId: parsed.conversationId,
      messages: parsed.messages.slice(-MAX_MESSAGES),
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveWidgetSession(botId: string, session: WidgetSession): void {
  try {
    localStorage.setItem(
      storageKey(botId),
      JSON.stringify({
        conversationId: session.conversationId,
        messages: session.messages.slice(-MAX_MESSAGES),
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* ignore quota errors */
  }
}

export function clearWidgetSession(botId: string): void {
  localStorage.removeItem(storageKey(botId));
}
