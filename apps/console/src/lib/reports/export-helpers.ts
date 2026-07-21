import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";
import { formatAmount } from "@/lib/sales/api";
import type { ReportExportApiType } from "@/lib/reports/export-api";

function ownerLabel(ownerId: string | null): string {
  return ownerId?.replace(/^sales_/, "") ?? "未分配";
}

function pctValue(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\r\n");
}

export function buildSalesExportKpis(overview: SalesOverviewMetrics | null) {
  return [
    {
      label: "成交金额",
      value: formatAmount(overview?.wonAmountTotal),
      trend: "—",
    },
    {
      label: "预估金额",
      value: formatAmount(overview?.estimatedAmountTotal),
      trend: "—",
    },
    {
      label: "有效询盘",
      value: String(overview?.effectiveInquiries ?? 0),
      trend: "—",
    },
    {
      label: "成交数",
      value: String(overview?.wonCount ?? 0),
      trend: "—",
    },
  ];
}

export function buildSalesExportFunnel(funnel: ConversionFunnelStep[]) {
  if (!funnel.length) return [];
  const base = funnel[0]?.count ?? 0;
  return funnel.map((step) => ({
    label: step.label,
    pct: base > 0 ? Math.round((step.count / base) * 100) : 0,
    count: step.count,
  }));
}

export function buildSalesExportTopRows(inquiries: InquiryListItem[]) {
  const grouped = new Map<string, { name: string; customers: number; won: number }>();

  for (const inquiry of inquiries) {
    if (!inquiry.ownerId) continue;
    const entry = grouped.get(inquiry.ownerId) ?? {
      name: ownerLabel(inquiry.ownerId),
      customers: 0,
      won: 0,
    };
    entry.customers += 1;
    if (inquiry.quoteStatus === "won") entry.won += 1;
    grouped.set(inquiry.ownerId, entry);
  }

  return [...grouped.values()]
    .sort((a, b) => b.customers - a.customers)
    .slice(0, 8)
    .map((row) => ({
      name: row.name,
      customers: row.customers,
      rate: pctValue(row.won, row.customers),
      amount: "—",
    }));
}

export function buildSalesExportTrend(funnel: ConversionFunnelStep[]) {
  if (!funnel.length) return [40, 55, 48, 62, 58, 70, 65, 78, 72, 80];
  const max = Math.max(...funnel.map((step) => step.count), 1);
  return funnel.slice(0, 10).map((step) => Math.max(12, Math.round((step.count / max) * 100)));
}

const INTENT_LABELS: Record<string, string> = {
  high: "高意向",
  medium: "中意向",
  low: "低意向",
};

const STATUS_LABELS: Record<string, string> = {
  open: "进行中",
  closed: "已关闭",
};

export function buildSalesOverviewCsv(
  overview: SalesOverviewMetrics | null,
  funnel: ConversionFunnelStep[],
  rangeLabel: string,
): string {
  const rows: Array<Array<string | number | null>> = [
    ["报表类型", "销售业绩报表"],
    ["统计区间", rangeLabel],
    ["导出时间", new Date().toLocaleString("zh-CN")],
    [],
    ["指标", "数值"],
    ["有效询盘", overview?.effectiveInquiries ?? 0],
    ["高意向", overview?.highIntentCount ?? 0],
    ["待报价", overview?.pendingQuoteCount ?? 0],
    ["已报价", overview?.quotedCount ?? 0],
    ["成交数", overview?.wonCount ?? 0],
    ["成交金额", overview?.wonAmountTotal ?? 0],
    ["预估金额", overview?.estimatedAmountTotal ?? 0],
  ];

  if (funnel.length) {
    rows.push([], ["漏斗阶段", "数量", "占比"]);
    const base = funnel[0]?.count ?? 0;
    for (const step of funnel) {
      rows.push([
        step.label,
        step.count,
        base > 0 ? `${Math.round((step.count / base) * 100)}%` : "—",
      ]);
    }
  }

  return rowsToCsv(rows);
}

export function buildInquiriesCsv(inquiries: InquiryListItem[], rangeLabel: string): string {
  const rows: Array<Array<string | number | null>> = [
    ["报表类型", "询盘报表"],
    ["统计区间", rangeLabel],
    ["导出时间", new Date().toLocaleString("zh-CN")],
    ["记录数", inquiries.length],
    [],
    ["询盘ID", "客户", "来源", "意向", "状态", "负责人", "摘要", "创建时间"],
    ...inquiries.map((item) => [
      item.id,
      item.customerName,
      item.sourceType,
      INTENT_LABELS[item.intentLevel] ?? item.intentLevel,
      STATUS_LABELS[item.status] ?? item.status,
      ownerLabel(item.ownerId),
      item.summary ?? "",
      item.createdAt,
    ]),
  ];
  return rowsToCsv(rows);
}

export function buildChannelsCsv(channels: ChannelAttributionItem[], rangeLabel: string): string {
  const rows: Array<Array<string | number | null>> = [
    ["报表类型", "渠道分析报表"],
    ["统计区间", rangeLabel],
    ["导出时间", new Date().toLocaleString("zh-CN")],
    ["渠道数", channels.length],
    [],
    ["渠道", "询盘数", "报价数", "成交数", "成交金额"],
    ...channels.map((item) => [
      item.sourceLabel,
      item.inquiryCount,
      item.quoteCount,
      item.wonCount,
      item.wonAmountTotal,
    ]),
  ];
  return rowsToCsv(rows);
}

export function buildReportCsv(input: {
  type: ReportExportApiType;
  overview: SalesOverviewMetrics | null;
  funnel: ConversionFunnelStep[];
  inquiries: InquiryListItem[];
  channels: ChannelAttributionItem[];
  rangeLabel: string;
}): string {
  if (input.type === "sales") {
    return buildSalesOverviewCsv(input.overview, input.funnel, input.rangeLabel);
  }
  if (input.type === "channels") {
    return buildChannelsCsv(input.channels, input.rangeLabel);
  }
  return buildInquiriesCsv(input.inquiries, input.rangeLabel);
}

export function reportFileName(type: ReportExportApiType): string {
  return `qiyun-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
}
