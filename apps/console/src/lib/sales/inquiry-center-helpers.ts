import type { InquiryTabKey } from "@/lib/sales/inquiries-center-mock";
import { formatChannelSourceLabel, isRawSiteSourceCode } from "@/lib/sales/channel-label";
import type { InquiryListItem, IntentLevel } from "@/lib/sales/types";

export function matchesInquiryTab(item: InquiryListItem, tab: InquiryTabKey): boolean {
  if (tab === "all") return true;
  if (tab === "new") {
    const created = Date.parse(item.createdAt);
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return item.status === "open" && (Number.isFinite(created) ? created >= threeDaysAgo : true);
  }
  if (tab === "supplement") return item.missingFields.length > 0;
  if (tab === "followup") {
    return item.status === "open" && Boolean(item.ownerId) && item.quoteStatus !== "won" && item.quoteStatus !== "lost";
  }
  if (tab === "to_quote") {
    return ["collecting", "engineering_review", "to_quote"].includes(item.quoteStatus);
  }
  if (tab === "quoted") {
    return ["quoted", "confirming"].includes(item.quoteStatus);
  }
  if (tab === "won") return item.quoteStatus === "won";
  if (tab === "lost") return item.quoteStatus === "lost" || item.status === "closed";
  return true;
}

export function buildInquiryListQuery(input: {
  tab: InquiryTabKey;
  q: string;
}): {
  limit: number;
  unassigned?: boolean;
  intent?: IntentLevel;
  q?: string;
} {
  const params: ReturnType<typeof buildInquiryListQuery> = { limit: 200 };
  const trimmed = input.q.trim();
  if (trimmed) params.q = trimmed;
  if (input.tab === "new" && !trimmed) params.unassigned = true;
  return params;
}

export function computeInquiryKpis(items: InquiryListItem[]) {
  const open = items.filter((item) => item.status === "open");
  return [
    {
      label: "询盘总数",
      value: String(items.length),
      trend: "",
      icon: "message" as const,
      color: "#3b82f6",
    },
    {
      label: "高意向",
      value: String(open.filter((item) => item.intentLevel === "high").length),
      trend: "",
      icon: "flame" as const,
      color: "#22c55e",
    },
    {
      label: "待跟进",
      value: String(open.filter((item) => item.ownerId && matchesInquiryTab(item, "followup")).length),
      trend: "",
      icon: "hourglass" as const,
      color: "#f59e0b",
    },
    {
      label: "待报价",
      value: String(open.filter((item) => matchesInquiryTab(item, "to_quote")).length),
      trend: "",
      icon: "file" as const,
      color: "#8b5cf6",
    },
  ];
}

export function computeTabCounts(items: InquiryListItem[]) {
  const tabs: InquiryTabKey[] = [
    "all",
    "new",
    "supplement",
    "followup",
    "to_quote",
    "quoted",
    "won",
    "lost",
  ];
  const labels: Record<InquiryTabKey, string> = {
    all: "全部",
    new: "新询盘",
    supplement: "待补充",
    followup: "待跟进",
    to_quote: "待报价",
    quoted: "已报价",
    won: "已成交",
    lost: "已丢单",
  };
  return tabs.map((key) => ({
    key,
    label: labels[key],
    count: items.filter((item) => matchesInquiryTab(item, key)).length,
  }));
}

/** 侧栏快速筛选角标，必须与当前列表同源计数 */
export function computeQuickFilters(items: InquiryListItem[]) {
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const unassigned = items.filter((item) => item.status === "open" && !item.ownerId).length;
  const stale = items.filter((item) => {
    if (item.status !== "open") return false;
    const updated = Date.parse(item.updatedAt ?? item.createdAt);
    return Number.isFinite(updated) && updated < threeDaysAgo;
  }).length;
  const highNoQuote = items.filter(
    (item) =>
      item.status === "open" &&
      item.intentLevel === "high" &&
      !["quoted", "confirming", "won"].includes(item.quoteStatus),
  ).length;
  const needSupplement = items.filter(
    (item) => item.status === "open" && item.missingFields.length > 0,
  ).length;
  return [
    { label: "待分配", count: unassigned, tab: "new" as InquiryTabKey },
    { label: "超3天未跟进", count: stale, tab: "followup" as InquiryTabKey },
    { label: "高意向未报价", count: highNoQuote, tab: "to_quote" as InquiryTabKey },
    { label: "待补充资料", count: needSupplement, tab: "supplement" as InquiryTabKey },
  ];
}

export function computeUnassignedAlerts(items: InquiryListItem[], limit = 3) {
  return items
    .filter((item) => item.status === "open" && !item.ownerId)
    .slice(0, limit)
    .map((item, index) => {
      const mapped = mapInquiryRowDisplay(item, index);
      const created = Date.parse(item.createdAt);
      const hours = Number.isFinite(created)
        ? Math.max(1, Math.round((Date.now() - created) / (60 * 60 * 1000)))
        : null;
      return {
        id: mapped.displayId,
        company: item.customerName?.trim() || "未命名客户",
        channel: mapped.channelLabel,
        time: hours == null ? "—" : hours < 24 ? `${hours}小时前` : `${Math.round(hours / 24)}天前`,
      };
    });
}

export function mapInquiryRowDisplay(item: InquiryListItem, index: number) {
  const statusTone =
    item.quoteStatus === "won"
      ? "won"
      : item.quoteStatus === "lost"
        ? "lost"
        : item.missingFields.length > 0
          ? "supplement"
          : ["collecting", "engineering_review", "to_quote"].includes(item.quoteStatus)
            ? "quote"
            : item.ownerId
              ? "follow"
              : "new";

  const statusLabels: Record<string, string> = {
    new: "新询盘",
    follow: "待跟进",
    quote: "待报价",
    supplement: "待补充",
    won: "已成交",
    lost: "已丢单",
  };

  const channelLabels: Record<string, string> = {
    website: "官网 Widget",
    douyin: "抖音",
    wechat: "微信",
    expo: "展会",
    sales_link: "销售链接",
    other: "其他",
  };

  const date = new Date(item.createdAt);
  const displayId = Number.isNaN(date.getTime())
    ? `INQ-${item.id.slice(-8).toUpperCase()}`
    : `INQ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}-${String(index + 1).padStart(3, "0")}`;

  const channelLabel = isRawSiteSourceCode(item.sourceCode)
    ? formatChannelSourceLabel({
        sourceCode: item.sourceCode,
        sourceLabel: item.sourceCode,
        sourceType: item.sourceType,
      })
    : (channelLabels[item.sourceType] ?? "官网 Widget");

  return {
    ...item,
    displayId,
    channelLabel,
    channelTone: item.sourceType === "website" || isRawSiteSourceCode(item.sourceCode) ? "site" : "social",
    productNeed: item.summary?.slice(0, 24) ?? "—",
    statusLabel: statusLabels[statusTone] ?? "待跟进",
    statusTone,
    ownerName: item.ownerId?.replace(/^sales_/, "") ?? "未分配",
    lastFollowUp: "—",
    lastFollowAgo: "—",
    intentFlames: item.intentLevel === "high" ? 3 : item.intentLevel === "medium" ? 2 : 1,
  };
}
