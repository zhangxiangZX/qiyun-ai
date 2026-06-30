import type {
  BotFilterOption,
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
} from "./types";

const botOptions: BotFilterOption[] = [
  { id: "bot-support", name: "官网客服" },
  { id: "bot-sales", name: "销售顾问" },
  { id: "bot-internal", name: "内部知识助手" },
];

const conversationDetails: Record<string, ConversationDetail> = {
  "conv-001": {
    id: "conv-001",
    visitorId: "visitor_8f2a",
    visitorLabel: "访客 #8f2a",
    summary: "想了解企业版报价和部署周期",
    botId: "bot-support",
    botName: "官网客服",
    status: "unresolved",
    hasLead: true,
    updatedAt: "2026-06-29T10:18:00.000Z",
    createdAt: "2026-06-29T10:05:00.000Z",
    tags: ["报价", "高意向"],
    assignee: "张晨",
    channel: "官网 Widget",
    pageUrl: "https://www.example.com/pricing",
    lead: {
      name: "李薇",
      phone: "138****2201",
      email: "lwei@example.com",
      company: "示例科技",
      capturedAt: "2026-06-29T10:16:00.000Z",
    },
    messages: [
      {
        id: "m-001",
        role: "user",
        content: "企业版怎么收费？支持私有化部署吗？",
        createdAt: "2026-06-29T10:05:00.000Z",
      },
      {
        id: "m-002",
        role: "assistant",
        content:
          "企业版按坐席与知识库容量计费，支持标准 SaaS 与私有化部署。私有化通常 2-4 周可完成首版上线。",
        createdAt: "2026-06-29T10:05:04.000Z",
        model: "gpt-4o-mini",
        tokenCount: 186,
        latencyMs: 1820,
        citations: [
          {
            id: "c-1",
            title: "产品支持文档 / 套餐说明",
            excerpt: "企业版支持私有化部署，可按项目评估交付周期。",
          },
        ],
      },
      {
        id: "m-003",
        role: "user",
        content: "能安排销售联系我吗？",
        createdAt: "2026-06-29T10:15:00.000Z",
      },
      {
        id: "m-004",
        role: "assistant",
        content: "可以，请留下联系方式，我们会安排顾问与你联系。",
        createdAt: "2026-06-29T10:15:03.000Z",
        model: "gpt-4o-mini",
        tokenCount: 42,
        latencyMs: 960,
      },
      {
        id: "m-005",
        role: "system",
        content: "访客已提交留资表单。",
        createdAt: "2026-06-29T10:16:00.000Z",
      },
    ],
  },
  "conv-002": {
    id: "conv-002",
    visitorId: "visitor_3c91",
    visitorLabel: "访客 #3c91",
    summary: "如何接入官网嵌入代码？",
    botId: "bot-support",
    botName: "官网客服",
    status: "resolved",
    hasLead: false,
    updatedAt: "2026-06-29T09:42:00.000Z",
    createdAt: "2026-06-29T09:38:00.000Z",
    tags: ["接入"],
    assignee: null,
    channel: "官网 Widget",
    pageUrl: "https://www.example.com/docs/widget",
    lead: null,
    messages: [
      {
        id: "m-101",
        role: "user",
        content: "嵌入代码要放在哪里？",
        createdAt: "2026-06-29T09:38:00.000Z",
      },
      {
        id: "m-102",
        role: "assistant",
        content: "将 script 标签粘贴到页面 </body> 前即可，保存后刷新页面验证。",
        createdAt: "2026-06-29T09:38:03.000Z",
        model: "gpt-4o-mini",
        tokenCount: 98,
        latencyMs: 1240,
        citations: [
          {
            id: "c-2",
            title: "产品支持文档 / Widget 接入",
            excerpt: "推荐将嵌入脚本放在 body 结束前。",
          },
        ],
      },
    ],
  },
  "conv-003": {
    id: "conv-003",
    visitorId: "visitor_71bd",
    visitorLabel: "访客 #71bd",
    summary: "标准版与专业版功能差异",
    botId: "bot-sales",
    botName: "销售顾问",
    status: "open",
    hasLead: false,
    updatedAt: "2026-06-29T08:55:00.000Z",
    createdAt: "2026-06-29T08:50:00.000Z",
    tags: ["套餐对比"],
    assignee: "王磊",
    channel: "落地页",
    pageUrl: "https://sales.example.com/plans",
    lead: null,
    messages: [
      {
        id: "m-201",
        role: "user",
        content: "标准版和专业版差在哪？",
        createdAt: "2026-06-29T08:50:00.000Z",
      },
      {
        id: "m-202",
        role: "assistant",
        content: "专业版额外支持多机器人、线索导出与高级报表，适合 10 人以上团队。",
        createdAt: "2026-06-29T08:50:04.000Z",
        model: "gpt-4o-mini",
        tokenCount: 112,
        latencyMs: 1560,
        citations: [
          {
            id: "c-3",
            title: "销售话术库 / 套餐对比",
            excerpt: "专业版包含多机器人管理与线索导出。",
          },
        ],
      },
    ],
  },
  "conv-004": {
    id: "conv-004",
    visitorId: "visitor_a104",
    visitorLabel: "访客 #a104",
    summary: "是否支持粤语语音识别？",
    botId: "bot-support",
    botName: "官网客服",
    status: "unresolved",
    hasLead: false,
    updatedAt: "2026-06-28T21:40:00.000Z",
    createdAt: "2026-06-28T21:38:00.000Z",
    tags: ["未命中", "功能咨询"],
    assignee: null,
    channel: "官网 Widget",
    pageUrl: "https://www.example.com/",
    lead: null,
    messages: [
      {
        id: "m-301",
        role: "user",
        content: "能不能识别粤语？",
        createdAt: "2026-06-28T21:38:00.000Z",
      },
      {
        id: "m-302",
        role: "assistant",
        content: "当前版本主要支持普通话文本对话，语音识别能力在路线图中，暂未开放。",
        createdAt: "2026-06-28T21:38:05.000Z",
        model: "gpt-4o-mini",
        tokenCount: 76,
        latencyMs: 2100,
      },
    ],
  },
  "conv-005": {
    id: "conv-005",
    visitorId: "visitor_e55f",
    visitorLabel: "访客 #e55f",
    summary: "内部文档检索权限如何配置？",
    botId: "bot-internal",
    botName: "内部知识助手",
    status: "pending",
    hasLead: false,
    updatedAt: "2026-06-28T17:10:00.000Z",
    createdAt: "2026-06-28T17:02:00.000Z",
    tags: ["内部"],
    assignee: "李薇",
    channel: "内网",
    pageUrl: "https://intranet.example.com/help",
    lead: null,
    messages: [
      {
        id: "m-401",
        role: "user",
        content: "不同部门能看到哪些文档？",
        createdAt: "2026-06-28T17:02:00.000Z",
      },
      {
        id: "m-402",
        role: "assistant",
        content: "可通过工作区与知识库权限组控制可见范围，默认仅本工作区成员可访问。",
        createdAt: "2026-06-28T17:02:06.000Z",
        model: "gpt-4o-mini",
        tokenCount: 94,
        latencyMs: 1780,
        citations: [
          {
            id: "c-4",
            title: "内部制度 / 权限说明",
            excerpt: "知识库访问受工作区成员身份约束。",
          },
        ],
      },
    ],
  },
};

function toListItem(detail: ConversationDetail): ConversationListItem {
  return {
    id: detail.id,
    visitorLabel: detail.visitorLabel,
    summary: detail.summary,
    botId: detail.botId,
    botName: detail.botName,
    status: detail.status,
    hasLead: detail.hasLead,
    updatedAt: detail.updatedAt,
    createdAt: detail.createdAt,
  };
}

export function getBotFilterOptions(): BotFilterOption[] {
  return botOptions;
}

export function listConversations(filters: ConversationFilters): ConversationListItem[] {
  let items = Object.values(conversationDetails).map(toListItem);

  if (filters.query.trim()) {
    const query = filters.query.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.visitorLabel.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.botName.toLowerCase().includes(query),
    );
  }

  if (filters.botId !== "all") {
    items = items.filter((item) => item.botId === filters.botId);
  }

  if (filters.hasLead === true) {
    items = items.filter((item) => item.hasLead);
  }

  if (filters.unresolvedOnly) {
    items = items.filter((item) => item.status === "unresolved");
  }

  return items.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function fetchConversations(filters: ConversationFilters): Promise<ConversationListItem[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(listConversations(filters)), 400);
  });
}

export function fetchConversationDetail(id: string): Promise<ConversationDetail | null> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(conversationDetails[id] ?? null), 250);
  });
}

export function updateConversationStatus(
  id: string,
  status: ConversationDetail["status"],
): ConversationDetail | null {
  const detail = conversationDetails[id];
  if (!detail) return null;
  detail.status = status;
  detail.updatedAt = new Date().toISOString();
  return detail;
}

export function updateConversationTags(id: string, tags: string[]): ConversationDetail | null {
  const detail = conversationDetails[id];
  if (!detail) return null;
  detail.tags = tags;
  detail.updatedAt = new Date().toISOString();
  return detail;
}
