import type { InquiryListItem } from "@/lib/sales/types";

export const INQUIRY_CENTER_KPIS = [
  { label: "询盘总数", value: "568", trend: "+12.3%", icon: "message", color: "#3b82f6" },
  { label: "高意向", value: "128", trend: "+18.7%", icon: "flame", color: "#22c55e" },
  { label: "待跟进", value: "86", trend: "+8.6%", icon: "hourglass", color: "#f59e0b" },
  { label: "待报价", value: "42", trend: "-4.2%", trendDown: true, icon: "file", color: "#8b5cf6" },
];

export type InquiryTabKey =
  | "all"
  | "new"
  | "supplement"
  | "followup"
  | "to_quote"
  | "quoted"
  | "won"
  | "lost";

export const INQUIRY_TABS: Array<{ key: InquiryTabKey; label: string; count: number }> = [
  { key: "all", label: "全部", count: 568 },
  { key: "new", label: "新询盘", count: 168 },
  { key: "supplement", label: "待补充", count: 64 },
  { key: "followup", label: "待跟进", count: 86 },
  { key: "to_quote", label: "待报价", count: 42 },
  { key: "quoted", label: "已报价", count: 28 },
  { key: "won", label: "已成交", count: 18 },
  { key: "lost", label: "已丢单", count: 16 },
];

export interface InquiryTableRow extends InquiryListItem {
  displayId: string;
  channelLabel: string;
  channelTone: "google" | "site" | "social" | "expo" | "email" | "ref";
  productNeed: string;
  statusLabel: string;
  statusTone: "new" | "follow" | "quote" | "supplement" | "won" | "lost";
  ownerName: string;
  lastFollowUp: string;
  lastFollowAgo: string;
  intentFlames: number;
}

export const INQUIRY_TABLE_ROWS: InquiryTableRow[] = [
  {
    id: "inq_demo_001",
    displayId: "INQ-202406-000568",
    conversationId: "conv_demo_001",
    leadId: "lead_demo_001",
    botId: "bot-cnc",
    botName: "户外机柜选型助手",
    customerName: "浙江迅达通信技术有限公司",
    customerContact: "李经理",
    sourceCode: "google-ads",
    sourceType: "website",
    channelLabel: "Google Ads",
    channelTone: "google",
    intentLevel: "high",
    intentFlames: 3,
    requirementCompleteness: 86,
    productNeed: "户外机柜 20台 IP65",
    summary: "采购户外机柜 20 台，需 IP65 防护，6 月底前交付。",
    missingFields: ["现场勘测尺寸"],
    needsEngineer: true,
    ownerId: "sales_zhang",
    ownerName: "张伟",
    nextActionAt: "2026-07-12T10:00:00.000Z",
    quoteStatus: "to_quote",
    status: "open",
    statusLabel: "待跟进",
    statusTone: "follow",
    lastFollowUp: "电话沟通确认防护等级",
    lastFollowAgo: "3小时前",
    updatedAt: "2026-07-10T09:12:00.000Z",
    createdAt: "2026-07-01T09:12:00.000Z",
  },
  {
    id: "inq_demo_002",
    displayId: "INQ-202406-000567",
    conversationId: "conv_demo_002",
    leadId: "lead_demo_002",
    botId: "bot-quote",
    botName: "工业报价顾问",
    customerName: "深圳云栈科技有限公司",
    customerContact: "王工",
    sourceCode: null,
    sourceType: "website",
    channelLabel: "独立站",
    channelTone: "site",
    intentLevel: "medium",
    intentFlames: 2,
    requirementCompleteness: 62,
    productNeed: "立式加工中心批量采购",
    summary: "咨询立式加工中心批量采购价格区间。",
    missingFields: ["加工件尺寸", "精度要求"],
    needsEngineer: false,
    ownerId: "sales_li",
    ownerName: "李娜",
    nextActionAt: "2026-07-14T11:00:00.000Z",
    quoteStatus: "collecting",
    status: "open",
    statusLabel: "待补充",
    statusTone: "supplement",
    lastFollowUp: "邮件发送产品目录",
    lastFollowAgo: "1天前",
    updatedAt: "2026-07-09T16:40:00.000Z",
    createdAt: "2026-06-30T16:40:00.000Z",
  },
  {
    id: "inq_demo_003",
    displayId: "INQ-202406-000566",
    conversationId: "conv_demo_003",
    leadId: null,
    botId: "bot-service",
    botName: "售后技术支持",
    customerName: "广州恒越物流",
    customerContact: "陈总",
    sourceCode: "douyin",
    sourceType: "wechat",
    channelLabel: "社媒平台",
    channelTone: "social",
    intentLevel: "high",
    intentFlames: 3,
    requirementCompleteness: 91,
    productNeed: "仓储自动化系统方案",
    summary: "仓储自动化系统方案与报价，预算约 34 万。",
    missingFields: [],
    needsEngineer: false,
    ownerId: "sales_zhang",
    ownerName: "张伟",
    nextActionAt: "2026-07-11T14:00:00.000Z",
    quoteStatus: "quoted",
    status: "open",
    statusLabel: "待报价",
    statusTone: "quote",
    lastFollowUp: "已发送初步方案",
    lastFollowAgo: "5小时前",
    updatedAt: "2026-07-10T11:05:00.000Z",
    createdAt: "2026-06-29T11:05:00.000Z",
  },
  {
    id: "inq_demo_004",
    displayId: "INQ-202406-000565",
    conversationId: "conv_demo_004",
    leadId: "lead_demo_004",
    botId: "bot-cnc",
    botName: "精密数控机床助手",
    customerName: "成都智联电子",
    customerContact: "赵经理",
    sourceCode: "expo-2026",
    sourceType: "expo",
    channelLabel: "展会活动",
    channelTone: "expo",
    intentLevel: "low",
    intentFlames: 1,
    requirementCompleteness: 45,
    productNeed: "边缘计算网关",
    summary: "边缘计算网关 x50，初步咨询。",
    missingFields: ["预算", "交期"],
    needsEngineer: false,
    ownerId: null,
    ownerName: "—",
    nextActionAt: null,
    quoteStatus: "collecting",
    status: "open",
    statusLabel: "新询盘",
    statusTone: "new",
    lastFollowUp: "—",
    lastFollowAgo: "—",
    updatedAt: "2026-07-09T14:22:00.000Z",
    createdAt: "2026-06-28T14:22:00.000Z",
  },
];

export const QUICK_FILTERS = [
  { label: "待分配", count: 23 },
  { label: "超3天未跟进", count: 39 },
  { label: "高意向未报价", count: 15 },
  { label: "待补充资料", count: 64 },
];

export const UNASSIGNED_ALERTS = [
  { id: "INQ-202406-000562", company: "宁波海创智能装备", channel: "Google Ads", time: "2小时前" },
  { id: "INQ-202406-000561", company: "无锡精工自动化", channel: "独立站", time: "4小时前" },
  { id: "INQ-202406-000560", company: "厦门光电科技", channel: "展会活动", time: "6小时前" },
];
