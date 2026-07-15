export type QuoteDisplayStatus =
  | "draft"
  | "to_send"
  | "sent"
  | "to_confirm"
  | "won"
  | "void"
  | "expiring";

export interface QuoteDashboardRow {
  id: string;
  number: string;
  company: string;
  inquiryId: string;
  product: string;
  amount: number;
  status: QuoteDisplayStatus;
  validity: string;
  validityNote: string;
  ownerName: string;
  ownerAvatar: string;
  updatedAt: string;
}

export const QUOTE_TAB_COUNTS: Record<QuoteDisplayStatus | "all", number> = {
  all: 128,
  draft: 14,
  to_send: 24,
  sent: 42,
  to_confirm: 18,
  won: 26,
  void: 4,
  expiring: 8,
};

export const QUOTE_DASHBOARD_STATS = {
  total: 128,
  totalGrowth: 18.7,
  toSend: 24,
  toSendGrowth: 12.6,
  sent: 42,
  sentGrowth: 8.3,
  toConfirm: 18,
  toConfirmGrowth: 5.2,
  won: 26,
  wonGrowth: 23.4,
  expiring: 8,
  expiringGrowth: 14.3,
};

export const QUOTE_DASHBOARD_ROWS: QuoteDashboardRow[] = [
  {
    id: "q1",
    number: "Q-20240601-001",
    company: "浙江坚诚机械有限公司",
    inquiryId: "INQ-20240528-015",
    product: "全自动包装生产线",
    amount: 128600,
    status: "to_send",
    validity: "2024-06-30",
    validityNote: "剩余 12 天",
    ownerName: "李娜",
    ownerAvatar: "李",
    updatedAt: "2024-06-01 10:32",
  },
  {
    id: "q2",
    number: "Q-20240531-008",
    company: "苏州智联自动化",
    inquiryId: "INQ-20240525-011",
    product: "户外机柜 IP54 方案",
    amount: 86500,
    status: "sent",
    validity: "2024-06-25",
    validityNote: "剩余 7 天",
    ownerName: "王磊",
    ownerAvatar: "王",
    updatedAt: "2024-05-31 16:45",
  },
  {
    id: "q3",
    number: "Q-20240530-006",
    company: "广州恒越物流",
    inquiryId: "INQ-20240520-009",
    product: "仓储自动化系统",
    amount: 342000,
    status: "to_confirm",
    validity: "2024-06-20",
    validityNote: "剩余 2 天",
    ownerName: "张伟",
    ownerAvatar: "张",
    updatedAt: "2024-05-30 14:10",
  },
  {
    id: "q4",
    number: "Q-20240528-004",
    company: "成都智联电子",
    inquiryId: "INQ-20240518-006",
    product: "边缘计算网关 x50",
    amount: 89600,
    status: "won",
    validity: "2024-06-15",
    validityNote: "已成交",
    ownerName: "陈晨",
    ownerAvatar: "陈",
    updatedAt: "2024-05-28 17:40",
  },
  {
    id: "q5",
    number: "Q-20240527-003",
    company: "南京华瑞医疗",
    inquiryId: "INQ-20240515-004",
    product: "洁净室监控方案",
    amount: 218000,
    status: "expiring",
    validity: "2024-05-28",
    validityNote: "已过期 1 天",
    ownerName: "刘洋",
    ownerAvatar: "刘",
    updatedAt: "2024-05-27 10:22",
  },
  {
    id: "q6",
    number: "Q-20240526-002",
    company: "深圳云栈科技",
    inquiryId: "INQ-20240512-003",
    product: "AI 选型页与知识库",
    amount: 56000,
    status: "draft",
    validity: "—",
    validityNote: "草稿",
    ownerName: "李娜",
    ownerAvatar: "李",
    updatedAt: "2024-05-26 09:15",
  },
  {
    id: "q7",
    number: "Q-20240525-001",
    company: "华东精密制造",
    inquiryId: "INQ-20240510-002",
    product: "工业机柜定制",
    amount: 128000,
    status: "sent",
    validity: "2024-06-22",
    validityNote: "剩余 4 天",
    ownerName: "王磊",
    ownerAvatar: "王",
    updatedAt: "2024-05-25 11:05",
  },
  {
    id: "q8",
    number: "Q-20240524-009",
    company: "武汉智造科技",
    inquiryId: "INQ-20240508-001",
    product: "伺服驱动系统",
    amount: 74500,
    status: "void",
    validity: "2024-05-20",
    validityNote: "已失效",
    ownerName: "张伟",
    ownerAvatar: "张",
    updatedAt: "2024-05-24 15:30",
  },
];

export const QUOTE_STATUS_LABELS: Record<QuoteDisplayStatus, string> = {
  draft: "草稿",
  to_send: "待发送",
  sent: "已发送",
  to_confirm: "待确认",
  won: "已成交",
  void: "已失效",
  expiring: "即将过期",
};
