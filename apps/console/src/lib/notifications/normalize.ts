import type { NotificationItem } from "@qiyun/ui";

import { getNotificationPreviewHint } from "@/lib/console/data-mode-hints";

export interface NormalizedNotificationFeed {
  items: NotificationItem[];
  unreadCount: number;
  previewHint: string | null;
  source: "upstream" | "preview";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeKind(value: unknown): NotificationItem["kind"] {
  if (
    value === "lead" ||
    value === "conversation" ||
    value === "system" ||
    value === "document" ||
    value === "invite"
  ) {
    return value;
  }
  return "system";
}

function inferKindFromTitle(title: string): NotificationItem["kind"] {
  if (title.includes("线索")) return "lead";
  if (title.includes("文档") || title.includes("索引") || title.includes("解析")) return "document";
  if (title.includes("邀请")) return "invite";
  if (title.includes("会话") || title.includes("问题")) return "conversation";
  return "system";
}

function normalizeItem(raw: unknown, index: number): NotificationItem | null {
  if (!isRecord(raw)) return null;

  const title = typeof raw.title === "string" ? raw.title : null;
  if (!title) return null;

  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.notificationId === "string"
        ? raw.notificationId
        : `notification-${index}`;

  const explicitKind = raw.kind ?? raw.type;

  return {
    id,
    title,
    body: typeof raw.body === "string" ? raw.body : typeof raw.message === "string" ? raw.message : undefined,
    timeLabel:
      typeof raw.timeLabel === "string"
        ? raw.timeLabel
        : typeof raw.createdAt === "string"
          ? raw.createdAt
          : "刚刚",
    href: typeof raw.href === "string" ? raw.href : typeof raw.link === "string" ? raw.link : undefined,
    unread: typeof raw.unread === "boolean" ? raw.unread : raw.read === false,
    kind: explicitKind ? normalizeKind(explicitKind) : inferKindFromTitle(title),
  };
}

function normalizeItems(payload: unknown): NotificationItem[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item, index) => normalizeItem(item, index))
      .filter((item): item is NotificationItem => item !== null);
  }

  if (!isRecord(payload)) return [];

  const list = payload.items ?? payload.notifications ?? payload.data;
  if (!Array.isArray(list)) return [];

  return list
    .map((item, index) => normalizeItem(item, index))
    .filter((item): item is NotificationItem => item !== null);
}

function normalizeUnreadCount(payload: unknown, items: NotificationItem[]): number {
  if (isRecord(payload)) {
    if (typeof payload.unreadCount === "number" && Number.isFinite(payload.unreadCount)) {
      return Math.max(0, payload.unreadCount);
    }
    if (typeof payload.unread === "number" && Number.isFinite(payload.unread)) {
      return Math.max(0, payload.unread);
    }
  }
  return items.filter((item) => item.unread).length;
}

export function normalizeNotificationFeed(
  payload: unknown,
  source: "upstream" | "preview",
): NormalizedNotificationFeed {
  const items = normalizeItems(payload);
  const unreadCount = normalizeUnreadCount(payload, items);

  return {
    items,
    unreadCount,
    previewHint: source === "preview" ? getNotificationPreviewHint() : null,
    source,
  };
}
