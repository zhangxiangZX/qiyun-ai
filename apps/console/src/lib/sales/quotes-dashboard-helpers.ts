import type { QuoteDisplayStatus } from "@/lib/sales/quotes-dashboard-mock";
import type { QuoteListItem, QuoteStage } from "@/lib/sales/types";

const EXPIRING_DAYS = 7;

export function mapQuoteStageToDisplayStatus(stage: QuoteStage): QuoteDisplayStatus {
  switch (stage) {
    case "collecting":
    case "engineering_review":
      return "draft";
    case "to_quote":
      return "to_send";
    case "quoted":
      return "sent";
    case "confirming":
      return "to_confirm";
    case "won":
      return "won";
    case "lost":
      return "void";
    default:
      return "draft";
  }
}

export function isQuoteExpiring(item: QuoteListItem): boolean {
  if (!item.quoteDueAt) return false;
  const due = Date.parse(item.quoteDueAt);
  if (!Number.isFinite(due)) return false;
  const daysLeft = (due - Date.now()) / (24 * 60 * 60 * 1000);
  return daysLeft >= 0 && daysLeft <= EXPIRING_DAYS && ["quoted", "confirming"].includes(item.stage);
}

export function resolveQuoteDisplayStatus(item: QuoteListItem): QuoteDisplayStatus {
  if (isQuoteExpiring(item)) return "expiring";
  return mapQuoteStageToDisplayStatus(item.stage);
}

export function stagesForDisplayStatus(status: QuoteDisplayStatus): QuoteStage[] {
  switch (status) {
    case "draft":
      return ["collecting", "engineering_review"];
    case "to_send":
      return ["to_quote"];
    case "sent":
      return ["quoted"];
    case "to_confirm":
      return ["confirming"];
    case "won":
      return ["won"];
    case "void":
      return ["lost"];
    default:
      return [];
  }
}

export function matchesQuoteStatusTab(item: QuoteListItem, tab: QuoteDisplayStatus | "all"): boolean {
  if (tab === "all") return true;
  if (tab === "expiring") return isQuoteExpiring(item);
  return resolveQuoteDisplayStatus(item) === tab;
}

export function buildQuoteListQuery(input: {
  tab: QuoteDisplayStatus | "all";
  q: string;
}): { status?: QuoteDisplayStatus; q?: string } {
  const params: { status?: QuoteDisplayStatus; q?: string } = {};
  const trimmed = input.q.trim();
  if (trimmed) params.q = trimmed;
  if (input.tab !== "all") params.status = input.tab;
  return params;
}

export function formatQuoteNumber(item: QuoteListItem, index: number): string {
  const date = new Date(item.createdAt);
  if (Number.isNaN(date.getTime())) {
    return `Q-${item.id.slice(-6).toUpperCase()}`;
  }
  return `Q-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(index + 1).padStart(3, "0")}`;
}

export function formatQuoteValidityNote(item: QuoteListItem): string {
  if (!item.quoteDueAt) return "—";
  const due = Date.parse(item.quoteDueAt);
  if (!Number.isFinite(due)) return "查看详情";
  const daysLeft = Math.ceil((due - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return "已过期";
  if (daysLeft <= EXPIRING_DAYS) return `剩余 ${daysLeft} 天`;
  return "查看详情";
}
