import type { HotOpportunity, SalesRankingItem } from "@/components/dashboard/mocks/boss-data";
import type { ChannelSegment } from "@/components/dashboard/mocks/boss-data";
import type { ManagementAlert } from "@/components/dashboard/mocks/boss-data";
import type { ConfigProgressItem, PendingInquiry } from "@/components/dashboard/mocks/admin-data";
import type {
  HighIntentCustomer,
  TodoItem,
} from "@/components/dashboard/mocks/sales-data";
import type { SalesLinkView } from "@/lib/channels/api";
import type { SiteConfig } from "@/lib/sites/types";
import { resolveSalesLinkPublicUrl } from "@/lib/channels/api";
import type { DashboardSnapshot, TrendPoint, TrendRange } from "@/lib/dashboard/types";
import { formatAmount } from "@/lib/sales/api";
import { formatChannelSourceLabel } from "@/lib/sales/channel-label";
import type {
  ChannelAttributionItem,
  InquiryAssignStats,
  InquiryListItem,
  IntentLevel,
  SalesOverviewMetrics,
  SourceType,
} from "@/lib/sales/types";
import { getQuoteStageLabel, INTENT_LABELS, SOURCE_TYPE_LABELS } from "@/lib/sales/types";

const CHANNEL_COLORS = ["#3b5eff", "#22c55e", "#f97316", "#8b5cf6", "#06b6d4", "#94a3b8"];

export type RoleKpiStripItem = {
  label: string;
  value: string;
  trendValue: string;
  trendDirection: "up" | "down";
  trendPct: string;
};

const NEUTRAL_TREND = {
  trendValue: "统计周期",
  trendDirection: "up" as const,
  trendPct: "—",
};

function countToday(items: Array<{ createdAt: string }>): number {
  const today = new Date().toDateString();
  return items.filter((item) => new Date(item.createdAt).toDateString() === today).length;
}

function isPendingQuote(item: InquiryListItem): boolean {
  return ["collecting", "engineering_review", "to_quote"].includes(item.quoteStatus);
}

function isQuotedStage(item: InquiryListItem): boolean {
  return ["quoted", "confirming"].includes(item.quoteStatus);
}

function intentStars(level: IntentLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function priorityFromIntent(level: IntentLevel): { priority: "高" | "中" | "低"; tone: "danger" | "warning" | "muted" } {
  if (level === "high") return { priority: "高", tone: "danger" };
  if (level === "medium") return { priority: "中", tone: "warning" };
  return { priority: "低", tone: "muted" };
}

function formatShortMonthDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapBossKpis(
  overview: SalesOverviewMetrics | null,
  inquiries: InquiryListItem[],
): RoleKpiStripItem[] {
  const open = inquiries.filter((item) => item.status === "open");
  const todayNew = countToday(inquiries);
  const pendingFollow = open.filter((item) => item.ownerId && !isQuotedStage(item) && item.quoteStatus !== "won").length;
  const pendingQuote = overview?.pendingQuoteCount ?? open.filter(isPendingQuote).length;
  const quotedUnreplied = open.filter((item) => item.quoteStatus === "quoted").length;

  return [
    { label: "今日新询盘", value: String(todayNew), ...NEUTRAL_TREND },
    { label: "待跟进客户", value: String(pendingFollow), ...NEUTRAL_TREND },
    { label: "待报价客户", value: String(pendingQuote), ...NEUTRAL_TREND },
    { label: "报价后未回复", value: String(quotedUnreplied), ...NEUTRAL_TREND },
    { label: "本月成交额", value: formatAmount(overview?.wonAmountTotal), ...NEUTRAL_TREND },
    { label: "本月单数", value: String(overview?.wonCount ?? 0), ...NEUTRAL_TREND },
  ];
}

export function mapAdminKpis(input: {
  assignStats: InquiryAssignStats | null;
  documentCount: number;
  botCount: number;
  siteCount: number;
  overview: SalesOverviewMetrics | null;
}): RoleKpiStripItem[] {
  return [
    {
      label: "待分配询盘",
      value: String(input.assignStats?.unassignedCount ?? 0),
      ...NEUTRAL_TREND,
    },
    { label: "知识库文档数", value: String(input.documentCount), ...NEUTRAL_TREND },
    { label: "AI助手在线数", value: String(input.botCount), ...NEUTRAL_TREND },
    {
      label: "有效询盘",
      value: String(input.overview?.effectiveInquiries ?? 0),
      ...NEUTRAL_TREND,
    },
    { label: "Widget安装站点", value: String(input.siteCount), ...NEUTRAL_TREND },
    {
      label: "高优未分配",
      value: String(input.assignStats?.highPriorityUnassignedCount ?? 0),
      ...NEUTRAL_TREND,
    },
  ];
}

export function mapSalesKpis(
  inquiries: InquiryListItem[],
  overview: SalesOverviewMetrics | null,
): RoleKpiStripItem[] {
  const open = inquiries.filter((item) => item.status === "open");
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const myNew = open.filter((item) => Date.parse(item.createdAt) >= threeDaysAgo).length;
  const todayFollow = open.filter((item) => {
    if (!item.nextActionAt) return false;
    return new Date(item.nextActionAt).toDateString() === new Date().toDateString();
  }).length;
  const pendingQuote = open.filter(isPendingQuote).length;
  const quotedUnreplied = open.filter((item) => item.quoteStatus === "quoted").length;

  return [
    { label: "我的新询盘", value: String(myNew), ...NEUTRAL_TREND },
    { label: "今日待跟进", value: String(todayFollow), ...NEUTRAL_TREND },
    { label: "待报价", value: String(pendingQuote), ...NEUTRAL_TREND },
    { label: "报价后未回复", value: String(quotedUnreplied), ...NEUTRAL_TREND },
    { label: "本月成交额", value: formatAmount(overview?.wonAmountTotal), ...NEUTRAL_TREND },
    { label: "本月成交单数", value: String(overview?.wonCount ?? 0), ...NEUTRAL_TREND },
  ];
}

function eachDateInclusive(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    return days;
  }
  while (cursor <= end) {
    days.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatTrendLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${month}-${day}`;
}

export function mapTrendSeries(
  snapshot: DashboardSnapshot,
  range: TrendRange | { from: string; to: string },
  overview: SalesOverviewMetrics | null,
  /** 传入则按所选日期聚合；空数组表示区间内无数据，显示 0 */
  inquiries?: InquiryListItem[],
): { labels: string[]; inquiries: number[]; deals: number[] } {
  const bounds =
    typeof range === "number"
      ? (() => {
          const to = new Date();
          const from = new Date();
          from.setDate(to.getDate() - (range - 1));
          const fmt = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return { from: fmt(from), to: fmt(to) };
        })()
      : range;

  const days = eachDateInclusive(bounds.from, bounds.to);
  const sourcePoints: TrendPoint[] = [
    ...(snapshot.trend30 ?? []),
    ...(snapshot.trend7 ?? []),
  ].filter((point): point is TrendPoint => typeof point?.date === "string");
  const byDate = new Map(sourcePoints.map((point) => [point.date.slice(0, 10), point]));

  const inquiryByDate = new Map<string, number>();
  const dealByDate = new Map<string, number>();
  for (const item of inquiries ?? []) {
    const day = item.createdAt.slice(0, 10);
    inquiryByDate.set(day, (inquiryByDate.get(day) ?? 0) + 1);
    if (item.quoteStatus === "won") {
      dealByDate.set(day, (dealByDate.get(day) ?? 0) + 1);
    }
  }

  const useInquirySeries = inquiries !== undefined;
  const winRate =
    overview && overview.effectiveInquiries > 0
      ? overview.wonCount / overview.effectiveInquiries
      : 0.12;

  return {
    labels: days.map(formatTrendLabel),
    inquiries: days.map((day) =>
      useInquirySeries ? (inquiryByDate.get(day) ?? 0) : (byDate.get(day)?.leads ?? 0),
    ),
    deals: days.map((day) => {
      if (useInquirySeries) return dealByDate.get(day) ?? 0;
      const leads = byDate.get(day)?.leads ?? 0;
      return Math.max(0, Math.round(leads * winRate));
    }),
  };
}

export function mapSalesTrendSeries(
  snapshot: DashboardSnapshot,
  days: 7 | 30 = 7,
): { labels: string[]; newInquiries: number[]; followed: number[] } {
  const points = days === 30 ? (snapshot.trend30 ?? snapshot.trend7) : snapshot.trend7;
  return {
    labels: points.map((point) => point.label),
    newInquiries: points.map((point) => point.leads),
    followed: points.map((point) => Math.max(0, Math.round(point.leads * 0.7))),
  };
}

function resolveChannelLabel(item: ChannelAttributionItem, sites: SiteConfig[]): string {
  return formatChannelSourceLabel(item, sites);
}

export function mapChannelDistribution(
  channels: ChannelAttributionItem[],
  snapshot: DashboardSnapshot,
  sites: SiteConfig[],
): ChannelSegment[] {
  if (channels.length > 0) {
    return channels
      .filter((item) => item.inquiryCount > 0)
      .sort((a, b) => b.inquiryCount - a.inquiryCount)
      .slice(0, 6)
      .map((item, index) => ({
        label: resolveChannelLabel(item, sites),
        value: item.inquiryCount,
        color: CHANNEL_COLORS[index % CHANNEL_COLORS.length] ?? "#94a3b8",
      }));
  }
  const fallback = snapshot.channelDistribution ?? [];
  return fallback.map((item, index) => ({
    label: item.label,
    value: item.sessions,
    color: CHANNEL_COLORS[index % CHANNEL_COLORS.length] ?? "#94a3b8",
  }));
}

export function mapHotOpportunities(inquiries: InquiryListItem[]): HotOpportunity[] {
  return inquiries
    .filter((item) => item.status === "open")
    .sort((a, b) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.intentLevel] - weight[a.intentLevel];
    })
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      company: item.customerName,
      channel: SOURCE_TYPE_LABELS[item.sourceType as SourceType] ?? item.sourceType,
      intentLevel: INTENT_LABELS[item.intentLevel],
      intentStars: intentStars(item.intentLevel),
      stage: getQuoteStageLabel(item.quoteStatus),
      owner: item.ownerId?.replace(/^sales_/, "") ?? "未分配",
      nextStep: item.summary?.trim() || "跟进客户需求",
      updatedAt: formatShortMonthDay(item.updatedAt),
    }));
}

export type SalesRankingMetric = "amount" | "inquiries" | "lost";

export function mapSalesRanking(
  inquiries: InquiryListItem[],
  metric: SalesRankingMetric = "amount",
): SalesRankingItem[] {
  const grouped = new Map<
    string,
    { name: string; inquiries: number; won: number; lost: number; amount: number }
  >();
  for (const item of inquiries) {
    const key = item.ownerId ?? "unassigned";
    const name = item.ownerId?.replace(/^sales_/, "") ?? "未分配";
    const entry = grouped.get(key) ?? { name, inquiries: 0, won: 0, lost: 0, amount: 0 };
    entry.inquiries += 1;
    if (item.quoteStatus === "won") {
      entry.won += 1;
      entry.amount += 10000;
    }
    if (item.quoteStatus === "lost") {
      entry.lost += 1;
    }
    grouped.set(key, entry);
  }

  const metricValue = (item: { inquiries: number; won: number; lost: number; amount: number }) => {
    if (metric === "inquiries") return item.inquiries;
    if (metric === "lost") return item.lost;
    return item.amount;
  };

  const metricLabel = (item: { inquiries: number; won: number; lost: number; amount: number }) => {
    if (metric === "inquiries") return String(item.inquiries);
    if (metric === "lost") return String(item.lost);
    return formatAmount(item.amount);
  };

  return [...grouped.values()]
    .filter((item) => item.name !== "未分配")
    .sort((a, b) => metricValue(b) - metricValue(a) || b.inquiries - a.inquiries)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      avatar: item.name.slice(0, 1),
      deals: item.won,
      amount: metricLabel(item),
      targetRate: Math.min(100, Math.round((item.won / Math.max(item.inquiries, 1)) * 100)),
      monthOverMonth: "—",
      momDirection: "up" as const,
    }));
}

export function mapManagementAlerts(
  overview: SalesOverviewMetrics | null,
  inquiries: InquiryListItem[],
): ManagementAlert[] {
  const open = inquiries.filter((item) => item.status === "open");
  const pendingFollow = open.filter((item) => item.ownerId).length;
  const pendingQuote = overview?.pendingQuoteCount ?? open.filter(isPendingQuote).length;
  const quoted = overview?.quotedCount ?? open.filter((item) => item.quoteStatus === "quoted").length;
  const overdue = open.filter((item) => item.nextActionAt && Date.parse(item.nextActionAt) < Date.now()).length;

  return [
    {
      id: "follow",
      type: "warning",
      icon: "🚩",
      title: "待跟进客户",
      count: pendingFollow,
      description: "位客户需要跟进",
      actionHref: "/dashboard/inquiries",
    },
    {
      id: "quote",
      type: "info",
      icon: "📋",
      title: "待报价客户",
      count: pendingQuote,
      description: "位客户等待报价",
      actionHref: "/dashboard/quotes",
    },
    {
      id: "quoted",
      type: "info",
      icon: "📞",
      title: "报价后未回复",
      count: quoted,
      description: "位客户未回复",
      actionHref: "/dashboard/quotes",
    },
    {
      id: "overdue",
      type: "success",
      icon: "🔔",
      title: "逾期跟进",
      count: overdue,
      description: "条跟进任务已逾期",
      actionHref: "/dashboard/tasks",
    },
  ];
}

export function mapPendingInquiries(inquiries: InquiryListItem[]): PendingInquiry[] {
  return inquiries
    .filter((item) => item.status === "open" && !item.ownerId)
    .slice(0, 5)
    .map((item) => {
      const { priority, tone } = priorityFromIntent(item.intentLevel);
      return {
        id: item.id,
        content: item.summary?.slice(0, 48) ?? item.customerName,
        sourceChannel: SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType,
        createdAt: formatDateTime(item.createdAt),
        priority,
        priorityTone: tone,
        action: "分配",
        actionHref: `/dashboard/inquiries/${item.id}`,
      };
    });
}

export function mapConfigProgress(input: {
  botCount: number;
  documentCount: number;
  siteCount: number;
}): { items: ConfigProgressItem[]; overall: number } {
  const items: ConfigProgressItem[] = [
    {
      id: "profile",
      name: "企业信息与设置",
      progress: 100,
      status: "已完成",
      statusTone: "done",
      actionLabel: "查看",
      actionHref: "/dashboard/team/profile",
    },
    {
      id: "knowledge",
      name: "知识库配置",
      progress: input.documentCount > 0 ? 100 : 20,
      status: input.documentCount > 0 ? "已完成" : "待开始",
      statusTone: input.documentCount > 0 ? "done" : "pending",
      actionLabel: input.documentCount > 0 ? "管理" : "去配置",
      actionHref: "/dashboard/knowledge-bases",
    },
    {
      id: "bots",
      name: "AI助手配置",
      progress: input.botCount > 0 ? 100 : 30,
      status: input.botCount > 0 ? "已完成" : "进行中",
      statusTone: input.botCount > 0 ? "done" : "in-progress",
      actionLabel: "配置",
      actionHref: "/dashboard/bots/config",
    },
    {
      id: "sites",
      name: "官网 Widget 设置",
      progress: input.siteCount > 0 ? 100 : 40,
      status: input.siteCount > 0 ? "已完成" : "进行中",
      statusTone: input.siteCount > 0 ? "done" : "in-progress",
      actionLabel: "配置",
      actionHref: "/dashboard/sites",
    },
  ];
  const overall = Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length);
  return { items, overall };
}

export function mapHighIntentCustomers(inquiries: InquiryListItem[]): HighIntentCustomer[] {
  return inquiries
    .filter((item) => item.status === "open" && item.intentLevel !== "low")
    .sort((a, b) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.intentLevel] - weight[a.intentLevel];
    })
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      name: item.customerName,
      intentLevel: INTENT_LABELS[item.intentLevel] as "高" | "中" | "低",
      lastContactTime: formatDateTime(item.updatedAt),
      amount: "—",
    }));
}

export function mapSalesTodos(inquiries: InquiryListItem[]): TodoItem[] {
  return inquiries
    .filter((item) => item.status === "open")
    .slice(0, 5)
    .map((item) => {
      const { priority } = priorityFromIntent(item.intentLevel);
      const type = isPendingQuote(item) ? "报价" : item.nextActionAt ? "跟进" : "回复";
      return {
        id: item.id,
        type: type as TodoItem["type"],
        title: item.summary?.slice(0, 32) ?? `跟进 ${item.customerName}`,
        company: item.customerName,
        time: item.nextActionAt ? formatDateTime(item.nextActionAt) : formatDateTime(item.updatedAt),
        priority,
      };
    });
}

export function mapMySalesLinks(links: SalesLinkView[]) {
  return links.slice(0, 2).map((link) => ({
    id: link.id,
    name: link.name,
    url: resolveSalesLinkPublicUrl(link),
    visits: link.visits,
    conversions: link.inquiries,
    downloads: link.conversions,
    status: link.status,
  }));
}
