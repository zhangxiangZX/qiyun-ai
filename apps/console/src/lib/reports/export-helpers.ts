import type {
  ConversionFunnelStep,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";
import { formatAmount } from "@/lib/sales/api";

function ownerLabel(ownerId: string | null): string {
  return ownerId?.replace(/^sales_/, "") ?? "未分配";
}

function pctValue(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
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
