import type { BotListItem } from "@/lib/bots/types";
import type { ConversationListItem } from "@/lib/conversations/types";
import type { DashboardKpi, DashboardSnapshot, RecentLead } from "@/lib/dashboard/types";

export type OverviewKpiTone = "blue" | "green" | "purple" | "orange" | "gray";

export interface OverviewKpiCard {
  id: string;
  title: string;
  value: string;
  trend: string;
  tone: OverviewKpiTone;
  icon: string;
  good: boolean;
}

export interface OverviewRobotRow {
  id: string;
  name: string;
  status: string;
  sessions: string;
  accuracy: string;
  online: boolean;
}

export interface OverviewChatRow {
  id: string;
  name: string;
  message: string;
  botName: string;
  time: string;
  unread?: string;
  online?: boolean;
}

export interface OverviewLeadRow {
  id: string;
  company: string;
  need: string;
  level: "高意向" | "中意向";
  time: string;
}

export interface OverviewChannelSegment {
  label: string;
  percent: number;
  className: string;
}

const CHANNEL_DOT_CLASSES = [
  "dotBlue",
  "dotIndigo",
  "dotGreen",
  "dotViolet",
  "dotGray",
] as const;

function formatTrend(kpi: DashboardKpi | undefined, prefix = "较上周"): string {
  if (!kpi) return `${prefix} —`;
  const arrow = kpi.trendDirection === "up" ? "↑" : kpi.trendDirection === "down" ? "↓" : "→";
  return `${prefix} ${arrow} ${kpi.trend}`;
}

function sumSessions(snapshot: DashboardSnapshot): number {
  const points = snapshot.trend7.length ? snapshot.trend7 : snapshot.trend30;
  return points.reduce((total, point) => total + point.sessions, 0);
}

function sumChannelSessions(snapshot: DashboardSnapshot): number {
  const items = snapshot.channelDistribution ?? [];
  if (!items.length) return sumSessions(snapshot);
  return items.reduce((total, item) => total + item.sessions, 0);
}

function resolveKpiValue(
  computed: string,
  byId: Record<string, DashboardKpi>,
  apiId: string,
): string {
  const fromApi = byId[apiId];
  if (fromApi?.value && fromApi.value !== "—") {
    return fromApi.value;
  }
  if (computed && computed !== "—" && computed !== "0") {
    return computed;
  }
  return "—";
}

function resolveKpiTrend(kpi: DashboardKpi | undefined): string {
  if (kpi && kpi.trend && kpi.trend !== "—") {
    return formatTrend(kpi);
  }
  return "较上周 —";
}

function isKpiTrendGood(id: string, kpi: DashboardKpi | undefined): boolean {
  if (!kpi?.trendDirection || kpi.trendDirection === "neutral") return true;
  if (id === "unresolved") return kpi.trendDirection === "down";
  return kpi.trendDirection === "up";
}

export function buildOverviewKpis(snapshot: DashboardSnapshot): OverviewKpiCard[] {
  const byId = Object.fromEntries(snapshot.kpis.map((item) => [item.id, item]));
  const highIntent = snapshot.recentLeads.filter((item) => item.status === "new").length;
  const unresolved = snapshot.unresolvedQuestions.length;

  const cards: Array<{
    id: string;
    title: string;
    computed: string;
    tone: OverviewKpiTone;
    icon: string;
    trendSource?: DashboardKpi;
    apiId: string;
  }> = [
    {
      id: "sessions",
      title: "总会话数",
      computed: String(sumSessions(snapshot) || ""),
      tone: "blue",
      icon: "chat",
      trendSource: byId.sessions,
      apiId: "sessions",
    },
    {
      id: "leads",
      title: "新增线索数",
      computed: String(snapshot.recentLeads.length || ""),
      tone: "green",
      icon: "userPlus",
      trendSource: byId.leads,
      apiId: "leads",
    },
    {
      id: "high-intent",
      title: "高意向线索",
      computed: String(highIntent || ""),
      tone: "purple",
      icon: "badge",
      trendSource: byId.visitors,
      apiId: "visitors",
    },
    {
      id: "response-time",
      title: "平均响应时间",
      computed: byId.response?.value ?? "",
      tone: "blue",
      icon: "target",
      trendSource: byId.response,
      apiId: "response",
    },
    {
      id: "unresolved",
      title: "未解决问题",
      computed: String(unresolved || ""),
      tone: "orange",
      icon: "question",
      trendSource: byId.unresolved,
      apiId: "unresolved",
    },
  ];

  return cards.map((card) => ({
    id: card.id,
    title: card.title,
    value: resolveKpiValue(card.computed, byId, card.apiId),
    trend: resolveKpiTrend(card.trendSource),
    tone: card.tone,
    icon: card.icon,
    good: isKpiTrendGood(card.id, card.trendSource),
  }));
}

export function buildChannelSegments(snapshot: DashboardSnapshot): OverviewChannelSegment[] {
  const items = snapshot.channelDistribution ?? [];
  const total = items.reduce((sum, item) => sum + item.sessions, 0);
  if (total <= 0) return [];

  return items.map((item, index) => ({
    label: item.label,
    percent: Math.round((item.sessions / total) * 1000) / 10,
    className: CHANNEL_DOT_CLASSES[index % CHANNEL_DOT_CLASSES.length],
  }));
}

export function getChannelTotalLabel(snapshot: DashboardSnapshot): string {
  const total = sumChannelSessions(snapshot);
  return total > 0 ? total.toLocaleString("zh-CN") : "—";
}

export function hasChannelDistribution(snapshot: DashboardSnapshot): boolean {
  return buildChannelSegments(snapshot).length > 0;
}

export function buildOverviewRobots(bots: BotListItem[]): OverviewRobotRow[] {
  if (!bots.length) return [];

  return bots.slice(0, 4).map((bot) => {
    const online = bot.status === "enabled";
    return {
      id: bot.id,
      name: bot.name,
      status: online ? "连接中" : bot.status === "draft" ? "草稿" : "已暂停",
      sessions: String(bot.conversations7d),
      accuracy: online && bot.conversations7d > 0 ? "—" : "0%",
      online,
    };
  });
}

function formatChatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  const diffDays = Math.round((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;

  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

export function buildOverviewChats(conversations: ConversationListItem[]): OverviewChatRow[] {
  if (!conversations.length) return [];

  return conversations.slice(0, 4).map((item, index) => ({
    id: item.id,
    name: item.visitorLabel,
    message: item.summary,
    botName: item.botName,
    time: formatChatTime(item.updatedAt),
    unread: item.hasLead && index === 0 ? "1" : undefined,
    online: item.status !== "resolved",
  }));
}

function mapLeadLevel(lead: RecentLead): "高意向" | "中意向" {
  if (lead.status === "new") return "高意向";
  return "中意向";
}

export function buildOverviewLeads(leads: RecentLead[]): OverviewLeadRow[] {
  if (!leads.length) return [];

  return leads.slice(0, 4).map((lead) => ({
    id: lead.id,
    company: lead.name === "匿名访客" ? lead.contact || lead.name : lead.name,
    need: `需求：${lead.lastQuestion}`,
    level: mapLeadLevel(lead),
    time: formatChatTime(lead.createdAt),
  }));
}

export function buildDateRangeOptions(): string[] {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const current = `${format(start)} ~ ${format(end)}`;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - 6);
  const previous = `${format(prevStart)} ~ ${format(prevEnd)}`;

  return [current, previous, "近 30 天"];
}

export function parseDateRangeSelection(selection: string): { from?: string; to?: string } {
  if (selection === "近 30 天") {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { from: format(start), to: format(end) };
  }

  const match = selection.match(/^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/);
  if (match) {
    return { from: match[1], to: match[2] };
  }

  return {};
}
