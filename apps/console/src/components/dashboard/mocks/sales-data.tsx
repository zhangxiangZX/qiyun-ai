/**
 * 销售首页（Sales Dashboard）Mock 数据
 */

import {
  MessageSquare,
  ClipboardList,
  FileText,
  Send,
  TrendingUp,
  ShoppingBag,
} from "lucide-react";

export interface SalesKpiItem {
  label: string;
  value: string;
  trendValue: string;
  trendDirection: "up" | "down";
  trendPct: string;
  icon: React.ReactNode;
  iconTone: "brand" | "success" | "purple" | "warning" | "info";
}

export const SALES_KPIS: SalesKpiItem[] = [
  {
    label: "我的新询盘",
    value: "18",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+12.5%",
    icon: <MessageSquare className="h-5 w-5" />,
    iconTone: "brand",
  },
  {
    label: "今日待跟进",
    value: "32",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+14.3%",
    icon: <ClipboardList className="h-5 w-5" />,
    iconTone: "success",
  },
  {
    label: "待报价",
    value: "9",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+12.5%",
    icon: <FileText className="h-5 w-5" />,
    iconTone: "warning",
  },
  {
    label: "报价后未回复",
    value: "6",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+25.0%",
    icon: <Send className="h-5 w-5" />,
    iconTone: "purple",
  },
  {
    label: "本月成交额",
    value: "¥86,200",
    trendValue: "较上月",
    trendDirection: "up",
    trendPct: "+18.7%",
    icon: <TrendingUp className="h-5 w-5" />,
    iconTone: "info",
  },
  {
    label: "本月成交单数",
    value: "8",
    trendValue: "较上月",
    trendDirection: "up",
    trendPct: "+14.3%",
    icon: <ShoppingBag className="h-5 w-5" />,
    iconTone: "warning",
  },
];

// 我的待办
export interface TodoItem {
  id: string;
  type: "跟进" | "报价" | "回复" | "跟进" | "准备"; // badge color
  title: string;
  company?: string;
  time: string;
  priority: "高" | "中" | "低";
}

export const MY_TODOS: TodoItem[] = [
  { id: "t1", type: "跟进", title: "跟进 3 条高意向询盘", company: "Google Ads 来源", time: "今天 14:00", priority: "高" },
  { id: "t2", type: "报价", title: "发送报价给 John Smith", company: "产品：智能名片套件 Pro", time: "今天 16:00", priority: "中" },
  { id: "t3", type: "回复", title: "回复客户询问：询价定制功能", company: "", time: "明天 10:00", priority: "中" },
  { id: "t4", type: "跟进", title: "跟进未回复报价客户", company: "ABC Technology Co.", time: "明天 15:30", priority: "低" },
  { id: "t5", type: "准备", title: "准备客户演示材料", company: "Global Trade Ltd.", time: "06-03 09:30", priority: "中" },
];

// 我的跟进日历
export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  company?: string;
  source?: string;
  status: "进行中" | "已完成" | "待处理" | "待验证";
  statusTone: "default" | "success" | "warning" | "muted";
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "e1", time: "09:30", title: "产品演示", company: "Global Trade Ltd.", source: "", status: "进行中", statusTone: "default" },
  { id: "e2", time: "11:00", title: "跟进电话", company: "", source: "Google Ads 渠道", status: "已完成", statusTone: "success" },
  { id: "e3", time: "14:00", title: "电话沟通", company: "TeleVision Inc.", source: "", status: "待处理", statusTone: "warning" },
  { id: "e4", time: "16:00", title: "发送报价", company: "John Smith", source: "", status: "待处理", statusTone: "warning" },
  { id: "e5", time: "17:30", title: "跟进回访报价", company: "ABC Technology Co.", source: "", status: "待验证", statusTone: "muted" },
];

// 我的询盘趋势（近7天）
export const SALES_TREND_LABELS = ["05-26", "05-27", "05-28", "05-29", "05-30", "05-31", "06-01"];
export const SALES_TREND_NEW = [8, 12, 10, 6, 11, 18, 9];
export const SALES_TREND_DONE = [5, 7, 6, 9, 11, 13, 6];

// 高意向客户
export interface HighIntentCustomer {
  rank: number;
  name: string;
  intentLevel: "高" | "中" | "低";
  lastContactTime: string;
  amount: string;
  avatar?: string; // emoji
}

export const HIGH_INTENT_CUSTOMERS: HighIntentCustomer[] = [
  { rank: 1, name: "TechVision Inc.", intentLevel: "高", lastContactTime: "今天 10:30", amount: "¥32,800", avatar: "🔶" },
  { rank: 2, name: "Global Trade Ltd.", intentLevel: "高", lastContactTime: "昨天 16:45", amount: "¥28,600", avatar: "🔶" },
  { rank: 3, name: "Innovate Solutions", intentLevel: "中", lastContactTime: "05-31 11:20", amount: "¥18,900", avatar: "🟡" },
  { rank: 4, name: "ABC Technology Co.", intentLevel: "中", lastContactTime: "05-30 14:15", amount: "¥15,600", avatar: "🟡" },
  { rank: 5, name: "Future Systems", intentLevel: "低", lastContactTime: "05-29 09:30", amount: "¥12,400", avatar: "🔵" },
];

// 最近跟进记录
export interface FollowUpRecord {
  id: string;
  customerName: string;
  action: string;
  detail?: string;
  time: string;
  avatar?: string;
}

export const RECENT_FOLLOWUPS: FollowUpRecord[] = [
  { id: "f1", customerName: "John Johnson (通语)", action: "评论了产品功能需求，客户对定制方案感兴趣", time: "今天 10:30", avatar: "" },
  { id: "f2", customerName: "发送报价单", action: "已发送智能名片套件 Pro 报价单 ¥32,800", time: "昨天 16:45", avatar: "" },
  { id: "f3", customerName: "跟进电话", action: "客户对产品集成和API有关问题", time: "05-31 11:20", avatar: "" },
  { id: "f4", customerName: "产品演示", action: "预订了 30 分钟的产品演示，客户反馈积极", time: "05-30 16:15", avatar: "" },
  { id: "f5", customerName: "初次联系", action: "通过 Google Ads 渠道获得新意向", time: "05-29 09:30", avatar: "" },
];

// 我的销售链接
export interface MySalesLink {
  id: string;
  name: string;
  url: string;
  visits: number;
  conversions: number;
  downloads: number;
  status: "active" | "paused";
  channelLabel: string;
}

export const MY_SALES_LINKS: MySalesLink[] = [
  {
    id: "sl1",
    name: "智能名片",
    url: "https://iyunai.com/s/zhangwei",
    visits: 128,
    conversions: 86,
    downloads: 12,
    status: "active",
    channelLabel: "已启用",
  },
  {
    id: "sl2",
    name: "产品手册",
    url: "https://iyunai.com/s/zhangwei/products",
    visits: 96,
    conversions: 64,
    downloads: 23,
    status: "active",
    channelLabel: "已启用",
  },
];
