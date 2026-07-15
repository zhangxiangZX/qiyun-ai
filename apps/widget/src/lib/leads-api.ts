import type { WidgetConfig } from "./types";

export interface SubmitLeadInput {
  config: WidgetConfig;
  conversationId: string;
  fields: Record<string, string>;
}

export async function submitPublicLead(input: SubmitLeadInput): Promise<void> {
  const response = await fetch(`${input.config.apiBase}/public/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      botId: input.config.botId,
      siteKey: input.config.siteKey,
      conversationId: input.conversationId,
      fields: input.fields,
    }),
  });

  if (!response.ok) {
    let message = `提交失败 (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}
