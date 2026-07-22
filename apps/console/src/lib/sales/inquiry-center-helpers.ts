import type { InquiryTabKey } from "@/lib/sales/inquiries-center-mock";
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

export function computeQuickFilters(items: InquiryListItem[]): Array<{
  label: string;
  count: number;
  tab: InquiryTabKey;
}> {
  return [
    { label: "高意向新询盘", count: items.filter((item) => item.status === "open" && item.intentLevel === "high" && !item.ownerId).length, tab: "new" },
    { label: "待补充资料", count: items.filter((item) => matchesInquiryTab(item, "supplement")).length, tab: "supplement" },
    { label: "待报价", count: items.filter((item) => matchesInquiryTab(item, "to_quote")).length, tab: "to_quote" },
  ];
}

export function computeUnassignedAlerts(items: InquiryListItem[]): Array<{
  id: string;
  company: string;
  channel: string;
  time: string;
}> {
  const channelLabels: Record<string, string> = {
    website: "官网", douyin: "抖音", wechat: "微信", expo: "展会", sales_link: "销售链接", other: "其他",
  };
  return items
    .filter((item) => item.status === "open" && !item.ownerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      company: item.customerName || "未命名客户",
      channel: channelLabels[item.sourceType] ?? "其他",
      time: new Date(item.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    }));
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
    website: "官网",
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

  return {
    ...item,
    displayId,
    channelLabel: channelLabels[item.sourceType] ?? "官网",
    channelTone: item.sourceType === "website" ? "site" : "social",
    productNeed: item.summary?.slice(0, 24) ?? "—",
    statusLabel: statusLabels[statusTone] ?? "待跟进",
    statusTone,
    ownerName: item.ownerId?.replace(/^sales_/, "") ?? "未分配",
    lastFollowUp: "—",
    lastFollowAgo: "—",
    intentFlames: item.intentLevel === "high" ? 3 : item.intentLevel === "medium" ? 2 : 1,
  };
}
