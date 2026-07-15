/**
 * 管理员首页（Admin Dashboard）Mock 数据
 */

import {
  MessageSquare,
  FileText,
  Bot,
  BarChart3,
  Code2,
  AlertTriangle,
} from "lucide-react";

export interface AdminKpiItem {
  label: string;
  value: string;
  trendValue: string;
  trendDirection: "up" | "down";
  trendPct: string;
  icon: React.ReactNode;
  iconTone: "brand" | "success" | "purple" | "warning" | "info";
}

export const ADMIN_KPIS: AdminKpiItem[] = [
  {
    label: "待分配询盘",
    value: "28",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+12.5%",
    icon: <MessageSquare className="h-5 w-5" />,
    iconTone: "brand",
  },
  {
    label: "知识库文档数",
    value: "1,268",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+4.3%",
    icon: <FileText className="h-5 w-5" />,
    iconTone: "success",
  },
  {
    label: "AI助手在线数",
    value: "36",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+9.1%",
    icon: <Bot className="h-5 w-5" />,
    iconTone: "purple",
  },
  {
    label: "选型页访问量",
    value: "2,356",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+18.7%",
    icon: <BarChart3 className="h-5 w-5" />,
    iconTone: "warning",
  },
  {
    label: "Widget安装站点",
    value: "156",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+6.8%",
    icon: <Code2 className="h-5 w-5" />,
    iconTone: "info",
  },
  {
    label: "今日待处理异常",
    value: "8",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+20.0%",
    icon: <AlertTriangle className="h-5 w-5" />,
    iconTone: "warning",
  },
];

// 配置进度概览
export interface ConfigProgressItem {
  id: string;
  name: string;
  progress: number; // 0-100
  status: "已完成" | "进行中" | "待开始" | "未完成";
  statusTone: "done" | "in-progress" | "pending" | "error";
  actionLabel?: string;
  actionHref?: string;
}

export const CONFIG_PROGRESS: ConfigProgressItem[] = [
  { id: "cp1", name: "企业信息与设置", progress: 100, status: "已完成", statusTone: "done", actionLabel: "查看", actionHref: "/dashboard/team/profile" },
  { id: "cp2", name: "知识库配置", progress: 85, status: "进行中", statusTone: "in-progress", actionLabel: "管理", actionHref: "/dashboard/knowledge-bases" },
  { id: "cp3", name: "AI助手配置", progress: 90, status: "进行中", statusTone: "in-progress", actionLabel: "配置", actionHref: "/dashboard/bots/config" },
  { id: "cp4", name: "官网需要设置", progress: 75, status: "进行中", statusTone: "in-progress", actionLabel: "配置", actionHref: "/dashboard/sites" },
  { id: "cp5", name: "通知与告警设置", progress: 100, status: "已完成", statusTone: "done", actionLabel: "查看", actionHref: "/dashboard/settings" },
  { id: "cp6", name: "系统安全设置", progress: 60, status: "进行中", statusTone: "in-progress", actionLabel: "未完成配置", actionHref: "/dashboard/team/security" },
];

// 总体完成度
export const OVERALL_PROGRESS = 85;

// 待分配询盘列表
export interface PendingInquiry {
  id: string;
  content: string; // 询盘内容摘要
  sourceChannel: string; // 来源渠道
  createdAt: string;
  priority: "高" | "中" | "低";
  priorityTone: "danger" | "warning" | "muted";
  action: string;
  actionHref: string;
}

export const PENDING_INQUIRIES: PendingInquiry[] = [
  {
    id: "pi1",
    content: "请贵司的智能客服能支持多语言吗？",
    sourceChannel: "官网表单",
    createdAt: "2024-06-01 10:25",
    priority: "高",
    priorityTone: "danger",
    action: "分配",
    actionHref: "/dashboard/inquiries/assign",
  },
  {
    id: "pi2",
    content: "要了解 AI 助手定制化方案",
    sourceChannel: "Google Ads",
    createdAt: "2024-06-01 09:58",
    priority: "中",
    priorityTone: "warning",
    action: "分配",
    actionHref: "/dashboard/inquiries/assign",
  },
  {
    id: "pi3",
    content: "想咨询关于AI助手的详细说明教程",
    sourceChannel: "微信公众号",
    createdAt: "2024-06-01 09:13",
    priority: "中",
    priorityTone: "warning",
    action: "分配",
    actionHref: "/dashboard/inquiries/assign",
  },
  {
    id: "pi4",
    content: "是否支持与我们有系统集成？",
    sourceChannel: "官网Widget",
    createdAt: "2024-06-01 08:47",
    priority: "高",
    priorityTone: "danger",
    action: "分配",
    actionHref: "/dashboard/inquiries/assign",
  },
  {
    id: "pi5",
    content: "了解账号权限管理的最佳实践",
    sourceChannel: "行业论坛",
    createdAt: "2024/06/01 08:21",
    priority: "低",
    priorityTone: "muted",
    action: "分配",
    actionHref: "/dashboard/inquiries/assign",
  },
];

// 知识库更新状态
export interface KnowledgeUpdateSegment {
  label: string;
  value: number;
  color: string;
}

export const KNOWLEDGE_SEGMENTS: KnowledgeUpdateSegment[] = [
  { label: "已发布", value: 984, color: "#22c55e" },
  { label: "审核中", value: 156, color: "#f97316" },
  { label: "草稿", value: 86, color: "#eab308" },
  { label: "已归档", value: 42, color: "#94a3b8" },
];

export interface RecentKnowledgeDoc {
  id: string;
  title: string;
  updatedAt: string;
}

export const RECENT_KNOWLEDGE_DOCS: RecentKnowledgeDoc[] = [
  { id: "kd1", title: "产品装嵌套规范v3.3", updatedAt: "06-01 10:12" },
  { id: "kd2", title: "AI 助手常见问题汇总", updatedAt: "06-01 09:45" },
  { id: "kd3", title: "售后工单系统使用说明", updatedAt: "05-31 16:30" },
  { id: "kd4", title: "插件开发标准流程指南", updatedAt: "05-31 14:20" },
];

// AI助手运行状态
export interface AiAssistantStatusSegment {
  label: string;
  value: number;
  color: string;
}

export const AI_ASSISTANT_SEGMENTS: AiAssistantStatusSegment[] = [
  { label: "在线", value: 36, color: "#22c55e" },
  { label: "离线", value: 0, color: "#94a3b8" },
  { label: "维护中", value: 0, color: "#f97316" },
  { label: "异常", value: 0, color: "#ef4444" },
];

// Widget 与选型页状态
export interface WidgetStats {
  installedSites: number;
  todayVisits: number;
  todayConversions: number;
  totalMessages: number;
  conversionRate: string;
}

export const WIDGET_STATS: WidgetStats = {
  installedSites: 156,
  todayVisits: 2356,
  todayConversions: 2185,
  totalMessages: 9246,
  conversionRate: "92.6%",
};

export interface SelectionPageStats {
  publishedPages: number;
  todayVisits: number;
  todayLeads: number;
  totalLeads: number;
  conversionRate: string;
}

export const SELECTION_PAGE_STATS: SelectionPageStats = {
  publishedPages: 36,
  todayVisits: 2356,
  todayLeads: 218,
  totalLeads: 9246,
  conversionRate: "9.26%",
};

// 成员活跃情况 [近7天]
export interface MemberActivity {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  loginCount: number;
  inquiriesHandled: number;
  knowledgeUpdates: number;
  activeDays: number; // 活跃天数（用竖线表示）
  maxActiveDays?: number; // for bar chart
}

export const MEMBER_ACTIVITIES: MemberActivity[] = [
  { id: "ma1", name: "张伟", avatar: "", role: "超级管理员", loginCount: 12, inquiriesHandled: 58, knowledgeUpdates: 15, activeDays: 7, maxActiveDays: 7 },
  { id: "ma2", name: "李娜明", avatar: "", role: "运营管理", loginCount: 9, inquiriesHandled: 42, knowledgeUpdates: 8, activeDays: 6, maxActiveDays: 7 },
  { id: "ma3", name: "王晨远", avatar: "", role: "销售主管", loginCount: 8, inquiriesHandled: 36, knowledgeUpdates: 5, activeDays: 6, maxActiveDays: 7 },
  { id: "ma4", name: "陈晨", avatar: "", role: "知识专员", loginCount: 7, inquiriesHandled: 18, knowledgeUpdates: 12, activeDays: 5, maxActiveDays: 7 },
  { id: "ma5", name: "赵宇", avatar: "", role: "技术支持", loginCount: 6, inquiriesHandled: 24, knowledgeUpdates: 3, activeDays: 5, maxActiveDays: 7 },
];

// 系统通知
export interface SystemNotification {
  id: string;
  type: "info" | "warning" | "success" | "danger";
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
}

export const SYSTEM_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "sn1",
    type: "danger",
    icon: "🔴",
    title: "[系统警告] 检测到 2 个 AI 助手实例响应超时",
    description: "ID(sales-assistant) 和 bot(id:assistant-v2) 响应超过阈值。",
    time: "10:15",
    isRead: false,
  },
  {
    id: "sn2",
    type: "info",
    icon: "ℹ️",
    title: "[功能更新] 知识库模块已支持自动上传",
    description: "支持 .docx / CSV / Excel 批量导入，用户内容管理更高效。",
    time: "09:30",
    isRead: false,
  },
  {
    id: "sn3",
    type: "success",
    icon: "✅",
    title: "[备份完成] 每日数据备份已成功",
    description: "2024-06-02 00:05 备份大小：2.34 GB。",
    time: "02:05",
    isRead: true,
  },
  {
    id: "sn4",
    type: "warning",
    icon: "🔒",
    title: "[安全提醒] 建议开启二次认证保护账号安全",
    description: "为保障账号安全，建议在「账户安全」中开启二次验证。",
    time: "05-31",
    isRead: true,
  },
];
