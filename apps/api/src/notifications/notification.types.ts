export type NotificationKind = "lead" | "conversation" | "system" | "document" | "invite";

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  timeLabel: string;
  href?: string;
  unread: boolean;
  kind: NotificationKind;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unreadCount: number;
}

export interface MarkNotificationsReadInput {
  ids?: string[];
  all?: boolean;
}

export interface MarkNotificationsReadResult {
  ok: true;
  markedIds: string[];
  unreadCount: number;
}
