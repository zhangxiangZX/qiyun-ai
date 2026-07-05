import type { RecentLead } from "./types";

const leadStatusLabels: Record<RecentLead["status"], string> = {
  new: "新建",
  pending: "待跟进",
  contacted: "已联系",
  proposal: "方案中",
  won: "已成交",
  invalid: "无效",
};

export function formatLeadStatus(status: RecentLead["status"]): string {
  return leadStatusLabels[status];
}

export function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天前`;
}
