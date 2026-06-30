import type { BotDetail, BotListItem, KnowledgeBaseOption } from "./types";

export const knowledgeBaseOptions: KnowledgeBaseOption[] = [
  { id: "kb-product", name: "产品支持文档" },
  { id: "kb-sales", name: "销售话术库" },
  { id: "kb-faq", name: "官网 FAQ" },
];

const botDetails: Record<string, BotDetail> = {
  "bot-support": {
    id: "bot-support",
    name: "官网客服",
    status: "enabled",
    knowledgeBaseCount: 2,
    conversations7d: 428,
    updatedAt: "2026-06-29T10:20:00.000Z",
    description: "面向官网访客的售前与售后问答机器人。",
    welcomeMessage: "你好，我是企云 AI 客服助手，有什么可以帮你？",
    systemPrompt: "你是专业、简洁的企业客服助手，优先依据知识库回答。",
    knowledgeBaseIds: ["kb-product", "kb-faq"],
    collectLeadsOnFailure: true,
    rateLimitPerMinute: 30,
    allowedDomains: ["www.example.com", "help.example.com"],
    leadFields: ["name", "phone", "email"],
    embedSnippet: `<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="bot-support" async></script>`,
  },
  "bot-sales": {
    id: "bot-sales",
    name: "销售顾问",
    status: "enabled",
    knowledgeBaseCount: 1,
    conversations7d: 156,
    updatedAt: "2026-06-28T16:05:00.000Z",
    description: "帮助销售团队回答套餐、报价与演示预约问题。",
    welcomeMessage: "想了解哪款产品？我可以帮你快速对比方案。",
    systemPrompt: "你是友好的销售顾问，回答要准确，必要时引导留资。",
    knowledgeBaseIds: ["kb-sales"],
    collectLeadsOnFailure: true,
    rateLimitPerMinute: 20,
    allowedDomains: ["sales.example.com"],
    leadFields: ["name", "company", "phone"],
    embedSnippet: `<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="bot-sales" async></script>`,
  },
  "bot-internal": {
    id: "bot-internal",
    name: "内部知识助手",
    status: "draft",
    knowledgeBaseCount: 3,
    conversations7d: 0,
    updatedAt: "2026-06-27T09:40:00.000Z",
    description: "仅供内部团队检索制度与流程文档。",
    welcomeMessage: "你好，我可以帮你查内部文档。",
    systemPrompt: "仅回答内部知识库内容，不对外提供商业承诺。",
    knowledgeBaseIds: ["kb-product", "kb-sales", "kb-faq"],
    collectLeadsOnFailure: false,
    rateLimitPerMinute: 60,
    allowedDomains: ["intranet.example.com"],
    leadFields: [],
    embedSnippet: `<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="bot-internal" async></script>`,
  },
};

export function listBots(): BotListItem[] {
  return Object.values(botDetails).map(
    ({ id, name, status, knowledgeBaseCount, conversations7d, updatedAt }) => ({
      id,
      name,
      status,
      knowledgeBaseCount,
      conversations7d,
      updatedAt,
    }),
  );
}

export function fetchBots(): Promise<BotListItem[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(listBots()), 500);
  });
}

export function fetchBotDetail(botId: string): Promise<BotDetail | null> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(botDetails[botId] ?? null), 300);
  });
}

export function createBotId(): string {
  return `bot-${Date.now().toString(36)}`;
}

export function createBotDraft(name: string): BotDetail {
  const id = createBotId();
  const now = new Date().toISOString();
  const draft: BotDetail = {
    id,
    name,
    status: "draft",
    knowledgeBaseCount: 0,
    conversations7d: 0,
    updatedAt: now,
    description: "",
    welcomeMessage: "你好，有什么可以帮你？",
    systemPrompt: "你是专业、友好的企业客服助手。",
    knowledgeBaseIds: [],
    collectLeadsOnFailure: true,
    rateLimitPerMinute: 30,
    allowedDomains: [],
    leadFields: ["name", "phone"],
    embedSnippet: `<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="${id}" async></script>`,
  };
  botDetails[id] = draft;
  return draft;
}
