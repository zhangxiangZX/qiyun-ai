import type { BotStatus } from "./types";

const statusLabels: Record<BotStatus, string> = {
  enabled: "已启用",
  disabled: "已停用",
  draft: "草稿",
};

export function formatBotStatus(status: BotStatus): string {
  return statusLabels[status];
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

export function formatConversationCount(count: number): string {
  return new Intl.NumberFormat("zh-CN").format(count);
}
