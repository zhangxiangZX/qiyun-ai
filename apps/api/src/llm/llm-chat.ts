import {
  buildKnowledgeContextInstruction,
  CONVERSATIONAL_STYLE_GUIDE,
} from "./conversational-style";

export class LlmChatError extends Error {}

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAICompatibleChatClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function createLlmChatClient(): OpenAICompatibleChatClient | null {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const provider = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_CHAT_MODEL?.trim();

  if (
    !provider.includes("openai") ||
    !baseUrl ||
    !apiKey ||
    !model ||
    apiKey === "replace-me"
  ) {
    return null;
  }

  return new OpenAICompatibleChatClient({ baseUrl, apiKey, model });
}

export function parseSseChatDeltaLines(chunk: string): {
  remainder: string;
  deltas: string[];
} {
  const lines = chunk.split("\n");
  const remainder = lines.pop() ?? "";
  const deltas: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "data: [DONE]") {
      continue;
    }

    if (!trimmed.startsWith("data:")) {
      continue;
    }

    const payloadText = trimmed.replace(/^data:\s*/, "");
    try {
      const payload = JSON.parse(payloadText) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.delta?.content;
      if (content) {
        deltas.push(content);
      }
    } catch {
      // Ignore malformed SSE chunks.
    }
  }

  return { remainder, deltas };
}

export class OpenAICompatibleChatClient {
  constructor(private readonly options: OpenAICompatibleChatClientOptions) {}

  async completeText(input: {
    messages: ChatCompletionMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const response = await fetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: input.messages,
          stream: false,
          temperature: input.temperature ?? 0.1,
          max_tokens: input.maxTokens ?? 256,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new LlmChatError(
        `Chat completion failed with status ${response.status}: ${detail.slice(0, 240)}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new LlmChatError("Chat completion returned no assistant content.");
    }
    return content;
  }

  async *streamTokens(input: {
    messages: ChatCompletionMessage[];
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string> {
    const response = await fetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: input.messages,
          stream: true,
          temperature: input.temperature ?? 0.3,
          max_tokens: input.maxTokens ?? 1024,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new LlmChatError(
        `Chat completion failed with status ${response.status}: ${detail.slice(0, 240)}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new LlmChatError("Chat completion returned no response body.");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChatDeltaLines(buffer);
      buffer = parsed.remainder;

      for (const delta of parsed.deltas) {
        yield delta;
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseChatDeltaLines(`${buffer}\n`);
      for (const delta of parsed.deltas) {
        yield delta;
      }
    }
  }
}

export function buildChatMessages(input: {
  botSystemPrompt: string;
  contextBlocks: string[];
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): ChatCompletionMessage[] {
  const persona = input.botSystemPrompt.trim() || "你是专业、友好的企业售前顾问。";

  const systemParts = [persona, CONVERSATIONAL_STYLE_GUIDE];

  if (input.contextBlocks.length > 0) {
    systemParts.push(buildKnowledgeContextInstruction(true));
    systemParts.push(...input.contextBlocks);
  } else {
    systemParts.push(buildKnowledgeContextInstruction(false));
  }

  return [
    { role: "system", content: systemParts.join("\n\n") },
    ...input.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: input.userMessage },
  ];
}
