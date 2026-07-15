import type { CalendarEvent } from "@/lib/calendar/types";
import type { FollowUpRecordRow } from "@/lib/reports/follow-up-analytics-mock";
import type {
  ConversionFunnelStep,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";
import { getQuoteStageLabel } from "@/lib/sales/types";

const METHOD_COLORS: Record<string, string> = {
  电话: "#2563eb",
  微信: "#22c55e",
  拜访: "#f59e0b",
  邮件: "#8b5cf6",
  其他: "#94a3b8",
};

const TIMELINESS_COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444"];

function ownerLabel(ownerId: string | null): string {
  return ownerId?.replace(/^sales_/, "") ?? "未分配";
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

function dayKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarMethodLabel(kind: CalendarEvent["kind"]): string {
  if (kind === "call") return "电话";
  if (kind === "meeting" || kind === "demo") return "拜访";
  if (kind === "reminder") return "邮件";
  if (kind === "follow_up") return "微信";
  return "其他";
}

function calendarResultLabel(status: CalendarEvent["status"]): string {
  if (status === "done") return "需求确认";
  if (status === "cancelled") return "无效跟进";
  return "待再次联系";
}

function quoteResultLabel(stage: InquiryListItem["quoteStatus"]): string {
  if (stage === "won") return "成交客户";
  if (stage === "lost") return "无效跟进";
  if (stage === "quoted" || stage === "confirming") return "报价推进";
  if (stage === "to_quote" || stage === "engineering_review") return "方案沟通";
  if (stage === "collecting") return "需求确认";
  return "待再次联系";
}

function pctValue(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function buildFollowUpKpis(input: {
  inquiries: InquiryListItem[];
  overview: SalesOverviewMetrics | null;
  calendarEvents: CalendarEvent[];
}) {
  const assigned = input.inquiries.filter((item) => item.ownerId);
  const doneEvents = input.calendarEvents.filter((item) => item.status === "done");
  const cycles = assigned
    .map((item) => (Date.parse(item.updatedAt) - Date.parse(item.createdAt)) / 86_400_000)
    .filter((days) => Number.isFinite(days) && days >= 0 && days <= 90);
  const avgCycle =
    cycles.length > 0 ? Number((cycles.reduce((sum, days) => sum + days, 0) / cycles.length).toFixed(1)) : 0;
  const totalFollowUps = input.calendarEvents.length + assigned.length;
  const effectiveFollowUps = doneEvents.length + assigned.filter((item) => item.intentLevel === "high").length;
  const conversionRate = pctValue(input.overview?.wonCount ?? 0, input.overview?.effectiveInquiries ?? assigned.length);

  return {
    totalCustomers: { value: assigned.length || input.inquiries.length, trend: "—" },
    totalFollowUps: { value: totalFollowUps, trend: "—" },
    effectiveFollowUps: { value: effectiveFollowUps, trend: "—" },
    avgCycleDays: { value: avgCycle, trend: "—" },
    conversionRate: { value: conversionRate, trend: "—" },
  };
}

export function buildFollowUpTrend(input: {
  inquiries: InquiryListItem[];
  calendarEvents: CalendarEvent[];
}) {
  const buckets = new Map<string, { total: number; effective: number; newCustomers: number }>();

  for (const event of input.calendarEvents) {
    const key = dayKey(event.start);
    if (!key) continue;
    const current = buckets.get(key) ?? { total: 0, effective: 0, newCustomers: 0 };
    current.total += 1;
    if (event.status === "done") current.effective += 1;
    buckets.set(key, current);
  }

  for (const inquiry of input.inquiries) {
    const key = dayKey(inquiry.createdAt);
    if (!key) continue;
    const current = buckets.get(key) ?? { total: 0, effective: 0, newCustomers: 0 };
    if (inquiry.leadId) current.newCustomers += 1;
    if (inquiry.ownerId) current.total += 1;
    if (inquiry.intentLevel !== "low") current.effective += 1;
    buckets.set(key, current);
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 0) return [];
  return sorted.slice(-8).map(([label, values]) => ({
    label,
    total: values.total,
    effective: values.effective,
    newCustomers: values.newCustomers,
  }));
}

export function buildFollowUpMethods(calendarEvents: CalendarEvent[]) {
  const counts = new Map<string, number>();
  for (const event of calendarEvents) {
    const label = calendarMethodLabel(event.kind);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      value: pctValue(count, total),
      color: METHOD_COLORS[label] ?? "#94a3b8",
    }));
}

export function buildFollowUpResults(inquiries: InquiryListItem[]) {
  const counts = new Map<string, number>();
  for (const inquiry of inquiries) {
    const label = quoteResultLabel(inquiry.quoteStatus);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = inquiries.length || 1;
  const order = ["无效跟进", "待再次联系", "需求确认", "方案沟通", "报价推进", "成交客户"];
  return order
    .filter((label) => counts.has(label))
    .map((label) => ({
      label,
      count: counts.get(label) ?? 0,
      pct: pctValue(counts.get(label) ?? 0, total),
    }));
}

export function buildFollowUpTopSales(input: {
  inquiries: InquiryListItem[];
  calendarEvents: CalendarEvent[];
}) {
  const grouped = new Map<string, { name: string; customers: Set<string>; followUps: number; won: number }>();

  for (const inquiry of input.inquiries) {
    if (!inquiry.ownerId) continue;
    const entry = grouped.get(inquiry.ownerId) ?? {
      name: ownerLabel(inquiry.ownerId),
      customers: new Set<string>(),
      followUps: 0,
      won: 0,
    };
    entry.customers.add(inquiry.id);
    entry.followUps += 1;
    if (inquiry.quoteStatus === "won") entry.won += 1;
    grouped.set(inquiry.ownerId, entry);
  }

  for (const event of input.calendarEvents) {
    const owner = event.ownerName ?? "未分配";
    const entry = grouped.get(owner) ?? {
      name: owner,
      customers: new Set<string>(),
      followUps: 0,
      won: 0,
    };
    entry.followUps += 1;
    grouped.set(owner, entry);
  }

  return [...grouped.values()]
    .sort((a, b) => b.followUps - a.followUps || b.customers.size - a.customers.size)
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      customers: item.customers.size,
      followUps: item.followUps,
      effective: Math.max(1, Math.round(item.followUps * 0.5)),
      rate: pctValue(item.won, Math.max(item.customers.size, 1)),
    }));
}

export function buildFollowUpStageConversion(funnel: ConversionFunnelStep[]) {
  if (!funnel.length) return [];
  const base = funnel[0]?.count ?? 0;
  const labels = ["初次接触", "需求确认", "方案沟通", "商务谈判", "成交客户"];
  const mapped = funnel.slice(0, 5).map((step, index) => {
    const rate = base > 0 ? pctValue(step.count, base) : 0;
    const prev = index > 0 ? funnel[index - 1]?.count ?? 0 : step.count;
    const drop = index > 0 && prev > 0 ? pctValue(prev - step.count, prev) : null;
    return { label: labels[index] ?? step.label, rate, drop };
  });
  return mapped;
}

export function buildFollowUpTimeliness(inquiries: InquiryListItem[]) {
  const buckets = { sameDay: 0, oneToThree: 0, fourToSeven: 0, overSeven: 0 };
  for (const inquiry of inquiries) {
    if (!inquiry.ownerId) continue;
    const created = Date.parse(inquiry.createdAt);
    const touched = Date.parse(inquiry.nextActionAt ?? inquiry.updatedAt);
    if (!Number.isFinite(created) || !Number.isFinite(touched)) continue;
    const days = Math.max(0, Math.round((touched - created) / 86_400_000));
    if (days <= 0) buckets.sameDay += 1;
    else if (days <= 3) buckets.oneToThree += 1;
    else if (days <= 7) buckets.fourToSeven += 1;
    else buckets.overSeven += 1;
  }
  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  return [
    { label: "当天跟进", value: pctValue(buckets.sameDay, total), color: TIMELINESS_COLORS[0]! },
    { label: "1-3 天", value: pctValue(buckets.oneToThree, total), color: TIMELINESS_COLORS[1]! },
    { label: "4-7 天", value: pctValue(buckets.fourToSeven, total), color: TIMELINESS_COLORS[2]! },
    { label: ">7 天", value: pctValue(buckets.overSeven, total), color: TIMELINESS_COLORS[3]! },
  ];
}

export function buildFollowUpRecords(input: {
  calendarEvents: CalendarEvent[];
  inquiries: InquiryListItem[];
}): FollowUpRecordRow[] {
  const eventRows = input.calendarEvents.map((event) => ({
    sortAt: Date.parse(event.start),
    row: {
      id: event.id,
      time: formatDateTime(event.start),
      customer: event.leadName ?? "客户",
      contact: "—",
      method: calendarMethodLabel(event.kind),
      result: calendarResultLabel(event.status),
      summary: event.note ?? event.title,
      nextTime: event.status === "done" ? "—" : formatDateTime(event.end),
      owner: event.ownerName ?? "未分配",
    },
  }));

  const inquiryRows = input.inquiries
    .filter((item) => item.ownerId)
    .slice(0, 20)
    .map((inquiry) => ({
      sortAt: Date.parse(inquiry.updatedAt),
      row: {
        id: `inq-${inquiry.id}`,
        time: formatDateTime(inquiry.updatedAt),
        customer: inquiry.customerName,
        contact: inquiry.customerContact ?? "—",
        method: "电话",
        result: quoteResultLabel(inquiry.quoteStatus),
        summary: inquiry.summary?.slice(0, 48) ?? getQuoteStageLabel(inquiry.quoteStatus),
        nextTime: inquiry.nextActionAt ? formatDateTime(inquiry.nextActionAt) : "—",
        owner: ownerLabel(inquiry.ownerId),
      },
    }));

  return [...eventRows, ...inquiryRows]
    .filter((item) => Number.isFinite(item.sortAt))
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 50)
    .map((item) => item.row);
}
