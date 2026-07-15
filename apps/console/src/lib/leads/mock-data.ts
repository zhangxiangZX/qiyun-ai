import type { LeadDetail, LeadFilters, LeadListItem } from "./types";
import { appendFollowUpRecord, enrichLeadDetail } from "./enrichment";

const botOptions = [
  { id: "bot-support", name: "官网客服" },
  { id: "bot-sales", name: "销售顾问" },
  { id: "bot-internal", name: "内部知识助手" },
];

const assigneeOptions = ["张晨", "李薇", "王磊"];

const leadStore: Record<string, LeadDetail> = {
  "lead-001": {
    id: "lead-001",
    name: "张晨",
    contact: "138****2201",
    phone: "138****2201",
    email: "zhangchen@example.com",
    company: "示例科技",
    sourceBotId: "bot-support",
    sourceBot: "官网客服",
    lastQuestion: "想了解企业版报价",
    status: "new",
    assignee: "李薇",
    createdAt: "2026-06-29T10:05:00.000Z",
    updatedAt: "2026-06-29T10:20:00.000Z",
    conversationId: "conv-001",
    notes: "客户对私有化部署有兴趣，需安排销售演示。",
    summary: "关键问题：想了解企业版报价；AI 回复摘要：已说明标准版与私有化差异。",
    sourceSiteName: "官网首页",
    requirement: "需要企业版报价与私有化方案",
    drawingAttachment: "已选附件：机柜方案.pdf（演示数据）",
    attachments: [
      {
        id: "att-001",
        fileName: "机柜方案.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2457600,
        uploadedAt: "2026-06-29T10:04:00.000Z",
        status: "ready",
      },
      {
        id: "att-002",
        fileName: "现场照片.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 512000,
        uploadedAt: "2026-06-29T10:04:30.000Z",
        status: "ready",
      },
    ],
    followUpRecords: [
      {
        id: "fu-003",
        kind: "note",
        title: "安排销售演示",
        body: "客户对私有化部署有兴趣，需安排销售演示。",
        actor: "李薇",
        createdAt: "2026-06-29T10:20:00.000Z",
      },
      {
        id: "fu-002",
        kind: "assignee",
        title: "负责人变更为李薇",
        actor: "系统",
        createdAt: "2026-06-29T10:10:00.000Z",
      },
      {
        id: "fu-001",
        kind: "system",
        title: "线索创建",
        body: "访客提交留资，等待销售跟进。",
        createdAt: "2026-06-29T10:05:00.000Z",
      },
    ],
  },
  "lead-002": {
    id: "lead-002",
    name: "李薇",
    contact: "lwei@example.com",
    email: "lwei@example.com",
    sourceBotId: "bot-sales",
    sourceBot: "销售顾问",
    lastQuestion: "能否安排产品演示？",
    status: "pending",
    assignee: "王磊",
    createdAt: "2026-06-29T09:18:00.000Z",
    updatedAt: "2026-06-29T11:00:00.000Z",
    conversationId: "conv-003",
    notes: "已发送演示链接，等待客户确认时间。",
  },
  "lead-003": {
    id: "lead-003",
    name: "匿名访客",
    contact: "—",
    sourceBotId: "bot-support",
    sourceBot: "官网客服",
    lastQuestion: "私有化部署周期多久？",
    status: "new",
    assignee: null,
    createdAt: "2026-06-28T16:44:00.000Z",
    updatedAt: "2026-06-28T16:44:00.000Z",
    conversationId: null,
    notes: "",
  },
  "lead-004": {
    id: "lead-004",
    name: "王磊",
    contact: "186****8890",
    phone: "186****8890",
    sourceBotId: "bot-sales",
    sourceBot: "销售顾问",
    lastQuestion: "API 限流策略是什么？",
    status: "won",
    assignee: "张晨",
    createdAt: "2026-06-27T11:30:00.000Z",
    updatedAt: "2026-06-28T09:15:00.000Z",
    conversationId: null,
    notes: "已签约标准版，等待开通。",
  },
  "lead-005": {
    id: "lead-005",
    name: "陈敏",
    contact: "chenmin@corp.cn",
    email: "chenmin@corp.cn",
    company: "星河制造",
    sourceBotId: "bot-support",
    sourceBot: "官网客服",
    lastQuestion: "是否支持多工作区？",
    status: "pending",
    assignee: "李薇",
    createdAt: "2026-06-26T14:22:00.000Z",
    updatedAt: "2026-06-27T10:40:00.000Z",
    conversationId: null,
    notes: "技术评估中，关注权限隔离方案。",
  },
  "lead-006": {
    id: "lead-006",
    name: "测试用户",
    contact: "test@spam.com",
    email: "test@spam.com",
    sourceBotId: "bot-internal",
    sourceBot: "内部知识助手",
    lastQuestion: "随便问问",
    status: "invalid",
    assignee: null,
    createdAt: "2026-06-25T08:10:00.000Z",
    updatedAt: "2026-06-25T08:30:00.000Z",
    conversationId: null,
    notes: "无效测试留资，已标记忽略。",
  },
};

function toListItem(detail: LeadDetail): LeadListItem {
  return {
    id: detail.id,
    name: detail.name,
    contact: detail.contact,
    sourceBotId: detail.sourceBotId,
    sourceBot: detail.sourceBot,
    lastQuestion: detail.lastQuestion,
    status: detail.status,
    assignee: detail.assignee,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export function getBotFilterOptions() {
  return botOptions;
}

export function getAssigneeOptions() {
  return assigneeOptions;
}

export function listLeads(filters: LeadFilters): LeadListItem[] {
  let items = Object.values(leadStore).map(toListItem);

  if (filters.query.trim()) {
    const query = filters.query.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.contact.toLowerCase().includes(query) ||
        item.lastQuestion.toLowerCase().includes(query) ||
        item.sourceBot.toLowerCase().includes(query) ||
        (item.assignee?.toLowerCase().includes(query) ?? false),
    );
  }

  if (filters.status !== "all") {
    items = items.filter((item) => item.status === filters.status);
  }

  if (filters.botId !== "all") {
    items = items.filter((item) => item.sourceBotId === filters.botId);
  }

  if (filters.assignee !== "all") {
    if (filters.assignee === "unassigned") {
      items = items.filter((item) => !item.assignee);
    } else {
      items = items.filter((item) => item.assignee === filters.assignee);
    }
  }

  return items.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function fetchLeads(filters: LeadFilters): Promise<LeadListItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(listLeads(filters)), 400);
  });
}

export function fetchLeadDetail(id: string): Promise<LeadDetail | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lead = leadStore[id];
      resolve(lead ? enrichLeadDetail(lead, { synthesizeTimeline: true }) : null);
    }, 200);
  });
}

export function updateLead(
  id: string,
  patch: Partial<Pick<LeadDetail, "status" | "assignee" | "notes">>,
): LeadDetail | null {
  const lead = leadStore[id];
  if (!lead) return null;

  const previousNotes = lead.notes;
  const previousStatus = lead.status;
  const previousAssignee = lead.assignee;
  const now = new Date().toISOString();

  Object.assign(lead, patch, { updatedAt: now });

  if (patch.notes !== undefined && patch.notes.trim() && patch.notes.trim() !== previousNotes.trim()) {
    lead.followUpRecords = appendFollowUpRecord(lead, {
      kind: "note",
      title: "新增跟进备注",
      body: patch.notes.trim(),
      actor: lead.assignee,
    });
  }

  if (patch.status !== undefined && patch.status !== previousStatus) {
    lead.followUpRecords = appendFollowUpRecord(lead, {
      kind: "status",
      title: `状态更新为 ${patch.status}`,
      actor: lead.assignee,
    });
  }

  if (patch.assignee !== undefined && patch.assignee !== previousAssignee) {
    lead.followUpRecords = appendFollowUpRecord(lead, {
      kind: "assignee",
      title: patch.assignee ? `负责人变更为 ${patch.assignee}` : "负责人已清空",
      actor: "系统",
    });
  }

  return enrichLeadDetail(lead, { synthesizeTimeline: true });
}

export function getLeadsForExport(filters: LeadFilters): LeadDetail[] {
  const ids = listLeads(filters).map((item) => item.id);
  return ids.map((id) => leadStore[id]).filter(Boolean);
}
