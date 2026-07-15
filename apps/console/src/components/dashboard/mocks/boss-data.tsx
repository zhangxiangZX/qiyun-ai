/**
 * 老板首页（Boss Dashboard）Mock 数据
 * 基于设计稿截图中的数据
 */

import {
  MessageSquare,
  Users,
  FileText,
  Send,
  TrendingUp,
  XCircle,
} from "lucide-react";

export interface BossKpiItem {
  label: string;
  value: string;
  trendValue: string;
  trendDirection: "up" | "down";
  trendPct: string;
  icon: React.ReactNode;
  iconTone: "brand" | "success" | "purple" | "warning" | "info";
}

export const BOSS_KPIS: BossKpiItem[] = [
  {
    label: "今日新询盘",
    value: "28",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+16.7%",
    icon: <MessageSquare className="h-5 w-5" />,
    iconTone: "brand",
  },
  {
    label: "待跟进客户",
    value: "86",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+8.0%",
    icon: <Users className="h-5 w-5" />,
    iconTone: "success",
  },
  {
    label: "待报价客户",
    value: "42",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+5.0%",
    icon: <FileText className="h-5 w-5" />,
    iconTone: "warning",
  },
  {
    label: "报价后未回复",
    value: "26",
    trendValue: "较昨日",
    trendDirection: "up",
    trendPct: "+4.0%",
    icon: <Send className="h-5 w-5" />,
    iconTone: "purple",
  },
  {
    label: "本月成交额",
    value: "¥128,600",
    trendValue: "较上月",
    trendDirection: "up",
    trendPct: "+18.7%",
    icon: <TrendingUp className="h-5 w-5" />,
    iconTone: "info",
  },
  {
    label: "本月单数",
    value: "18",
    trendValue: "较上月",
    trendDirection: "up",
    trendPct: "+10.0%",
    icon: <XCircle className="h-5 w-5" />,
    iconTone: "warning",
  },
];

// 7日询盘与成交趋势
export const TREND_7D_LABELS = ["05-26", "05-27", "05-28", "05-29", "05-30", "05-31", "06-01"];
export const TREND_7D_INQUIRIES = [32, 45, 38, 52, 41, 60, 28];
export const TREND_7D_DEALS = [6, 8, 7, 10, 9, 12, 5];

// 销售团队排行
export interface SalesRankingItem {
  rank: number;
  name: string;
  avatar?: string; // emoji or initial
  deals: number;
  amount: string;
  targetRate: number; // 目标完成率 %
  monthOverMonth: string;
  momDirection: "up" | "down";
}

export const SALES_RANKING: SalesRankingItem[] = [
  { rank: 1, name: "李娜", avatar: "👩", deals: 6, amount: "¥45,600", targetRate: 35, monthOverMonth: "+25.3%", momDirection: "up" },
  { rank: 2, name: "王磊", avatar: "👨", deals: 5, amount: "¥32,800", targetRate: 28, monthOverMonth: "+12.6%", momDirection: "up" },
  { rank: 3, name: "陈晨", avatar: "👩", deals: 4, amount: "¥22,400", targetRate: 21, monthOverMonth: "+8.7%", momDirection: "up" },
  { rank: 4, name: "赵宇", avatar: "👨", deals: 3, amount: "¥16,300", targetRate: 13, monthOverMonth: "+5.2%", momDirection: "down" },
  { rank: 5, name: "周婷", avatar: "👩", deals: 2, amount: "¥11,500", targetRate: 9, monthOverMonth: "+2.1%", momDirection: "down" },
];

// 重点商机
export interface HotOpportunity {
  id: string;
  company: string;
  channel: string; // 来源渠道
  intentLevel: string; // 意向等级 (高/中/低)
  intentStars: number; // 1-3 stars
  stage: string; // 当前阶段
  owner: string;
  ownerAvatar?: string;
  nextStep: string;
  updatedAt: string;
}

export const HOT_OPPORTUNITIES: HotOpportunity[] = [
  { id: "o1", company: "浙江宏远机械有限公司", channel: "Google Ads", intentLevel: "高", intentStars: 3, stage: "商务谈判", owner: "李娜", nextStep: "安顿技术方案演示", updatedAt: "06-03" },
  { id: "o2", company: "上海晟达装备有限公司", channel: "独立站", intentLevel: "高", intentStars: 3, stage: "方案报价", owner: "王磊", nextStep: "发送最终版报价单", updatedAt: "06-02" },
  { id: "o3", company: "广州优创电子科技有限公司", channel: "社媒平台", intentLevel: "中", intentStars: 2, stage: "需求确认", owner: "陈晨", nextStep: "确认需求细节", updatedAt: "06-03" },
  { id: "o4", company: "深圳信诚设备有限公司", channel: "展会活动", intentLevel: "中", intentStars: 2, stage: "初步沟通", owner: "赵宇", nextStep: "跟进客户需求", updatedAt: "06-04" },
  { id: "o5", company: "青岛海拓国际贸易有限公司", channel: "老客户推荐", intentLevel: "中", intentStars: 2, stage: "方案报价", owner: "周婷", nextStep: "优化报价方案", updatedAt: "06-05" },
];

// 来源渠道分布
export interface ChannelSegment {
  label: string;
  value: number;
  color: string;
}

export const CHANNEL_DISTRIBUTION: ChannelSegment[] = [
  { label: "Google Ads", value: 168, color: "#3b5eff" },
  { label: "独立站", value: 128, color: "#22c55e" },
  { label: "社媒平台", value: 96, color: "#f97316" },
  { label: "老客户推荐", value: 64, color: "#8b5cf6" },
  { label: "展会活动", value: 48, color: "#06b6d4" },
  { label: "其他", value: 64, color: "#94a3b8" },
];

// 管理提醒
export interface ManagementAlert {
  id: string;
  type: "warning" | "info" | "danger" | "success";
  icon: React.ReactNode;
  title: string;
  count?: number;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export const MANAGEMENT_ALERTS: ManagementAlert[] = [
  {
    id: "a1",
    type: "warning",
    icon: "🚩",
    title: "今日待跟进客户",
    count: 86,
    description: "8 位客户需要跟进",
    actionHref: "/dashboard/inquiries",
  },
  {
    id: "a2",
    type: "info",
    icon: "📋",
    title: "待报价客户",
    count: 42,
    description: "位客户等待报价",
    actionHref: "/dashboard/quotes",
  },
  {
    id: "a3",
    type: "info",
    icon: "📞",
    title: "报价后未回复",
    count: 26,
    description: "位客户未回复",
    actionHref: "/dashboard/quotes?filter=unreplied",
  },
  {
    id: "a4",
    type: "success",
    icon: "🔔",
    title: "即将到期提醒",
    count: 5,
    description: "条跟进任务即将到期",
    actionHref: "/dashboard/tasks",
  },
];
