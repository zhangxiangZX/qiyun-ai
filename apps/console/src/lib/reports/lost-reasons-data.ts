import { listQuoteOpportunities } from "@/lib/sales/api";
import type { QuoteListItem } from "@/lib/sales/types";

export const LOST_REASON_LABELS: Record<string, string> = {
  price: "价格过高",
  delivery: "交期不匹配",
  spec_mismatch: "需求变更",
  project_paused: "项目暂停",
  competitor: "竞品胜出",
  no_follow_up: "响应不足",
  other: "其他原因",
};

const REASON_COLORS = ["#3b5eff", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#94a3b8"];

export interface LostReasonShare {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export interface LostReasonRow {
  id: string;
  company: string;
  stage: string;
  stageTone: string;
  reason: string;
  amount: number;
  owner: string;
  date: string;
  action: string;
}

export async function loadLostReasonsReport(): Promise<{
  shares: LostReasonShare[];
  rows: LostReasonRow[];
  totalLost: number;
}> {
  const quotes = await listQuoteOpportunities().catch(() => [] as QuoteListItem[]);

  const lostQuotes = quotes.filter((q) => q.stage === "lost" || q.lostReason);

  const reasonCounts = new Map<string, number>();
  for (const quote of lostQuotes) {
    const key = quote.lostReason ?? "other";
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  if (reasonCounts.size === 0 && lostQuotes.length === 0) {
    return { shares: [], rows: [], totalLost: 0 };
  }

  const total = [...reasonCounts.values()].reduce((sum, n) => sum + n, 0) || lostQuotes.length;
  const shares: LostReasonShare[] = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], index) => ({
      name: LOST_REASON_LABELS[key] ?? key,
      value,
      pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
      color: REASON_COLORS[index % REASON_COLORS.length],
    }));

  const rows: LostReasonRow[] = lostQuotes.slice(0, 20).map((quote) => ({
    id: quote.inquiryId.slice(0, 12).toUpperCase(),
    company: quote.customerName,
    stage: quote.stageLabel || "方案阶段",
    stageTone: "orange",
    reason: LOST_REASON_LABELS[quote.lostReason ?? "other"] ?? "其他原因",
    amount: quote.estimatedAmount ?? quote.quotedAmount ?? 0,
    owner: quote.ownerId?.replace(/^sales_/, "") ?? "未分配",
    date: quote.updatedAt.slice(0, 10),
    action: "复盘并更新跟进策略",
  }));

  return { shares, rows, totalLost: total };
}
