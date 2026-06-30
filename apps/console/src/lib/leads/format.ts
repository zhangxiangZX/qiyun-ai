import type { LeadStatus } from "./types";

const statusLabels: Record<LeadStatus, string> = {
  new: "新建",
  following: "跟进中",
  won: "已成交",
  invalid: "无效",
};

export function formatLeadStatus(status: LeadStatus): string {
  return statusLabels[status];
}

export function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
