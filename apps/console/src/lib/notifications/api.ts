import type { NotificationItem } from "@qiyun/ui";

import { apiRequest } from "@/lib/api/client";

export type NotificationLoadState = "loading" | "ready" | "error";

export interface NotificationFeed {
  items: NotificationItem[];
  unreadCount: number;
  previewHint?: string | null;
  source: "upstream" | "preview";
  readStateScope?: string;
  readPersistence?: "bff-cookie" | "upstream";
}

export interface MarkNotificationsReadResult {
  ok: boolean;
  markedIds: string[];
  unreadCount: number;
  readStateScope?: string;
  readPersistence?: "bff-cookie" | "upstream";
}

export async function fetchNotifications(): Promise<NotificationFeed> {
  return apiRequest<NotificationFeed>("/notifications");
}

export async function markNotificationsRead(input: {
  ids?: string[];
  all?: boolean;
}): Promise<MarkNotificationsReadResult> {
  return apiRequest<MarkNotificationsReadResult>("/notifications/read", {
    method: "POST",
    body: input,
  });
}
