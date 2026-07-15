import type { NextRequest, NextResponse } from "next/server";

import type { NotificationItem } from "@qiyun/ui";

import { getAuthUser, shouldUseSecureCookies } from "@/server/auth-session";

/**
 * Console BFF notification read-state contract (V1).
 *
 * Upstream `GET /notifications` does not expose mark-read yet. Console persists
 * read IDs per workspace in an httpOnly cookie and merges on every feed fetch.
 *
 * - GET  /api/notifications          → items with `unread` adjusted + unreadCount
 * - POST /api/notifications/read       → { ids?: string[]; all?: boolean }
 *       Response: { ok: true; markedIds: string[]; unreadCount: number }
 *
 * When apps/api adds POST /notifications/read, BFF may forward first and fall
 * back to cookie overlay on 404/501.
 */

export const NOTIFICATION_READ_COOKIE = "qiyun_notification_read";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const MAX_IDS_PER_SCOPE = 500;

export interface NotificationReadCookiePayload {
  v: 1;
  scopes: Record<string, string[]>;
}

export function resolveNotificationReadScope(
  request: NextRequest,
  source: "preview" | "upstream",
): string {
  if (source === "preview") {
    return "preview";
  }

  const workspaceId = getAuthUser(request)?.activeWorkspaceId;
  return workspaceId ? `ws:${workspaceId}` : "upstream:anonymous";
}

export function parseNotificationReadCookie(
  value: string | undefined,
): NotificationReadCookiePayload {
  if (!value) {
    return { v: 1, scopes: {} };
  }

  try {
    const parsed = JSON.parse(value) as Partial<NotificationReadCookiePayload>;
    if (parsed.v !== 1 || typeof parsed.scopes !== "object" || !parsed.scopes) {
      return { v: 1, scopes: {} };
    }

    const scopes: Record<string, string[]> = {};
    for (const [key, ids] of Object.entries(parsed.scopes)) {
      if (!Array.isArray(ids)) continue;
      scopes[key] = ids.filter((id): id is string => typeof id === "string").slice(0, MAX_IDS_PER_SCOPE);
    }

    return { v: 1, scopes };
  } catch {
    return { v: 1, scopes: {} };
  }
}

export function readNotificationReadIds(request: NextRequest, scope: string): Set<string> {
  const payload = parseNotificationReadCookie(request.cookies.get(NOTIFICATION_READ_COOKIE)?.value);
  return new Set(payload.scopes[scope] ?? []);
}

export function writeNotificationReadCookie(
  response: NextResponse,
  payload: NotificationReadCookiePayload,
): void {
  response.cookies.set(NOTIFICATION_READ_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function applyNotificationReadState(
  items: NotificationItem[],
  readIds: Set<string>,
): { items: NotificationItem[]; unreadCount: number } {
  const remaining = items.filter((item) => !readIds.has(item.id));

  return {
    items: remaining,
    unreadCount: remaining.filter((item) => item.unread).length,
  };
}

export function mergeReadIds(
  request: NextRequest,
  scope: string,
  idsToMark: string[],
  allItemIds: string[],
  markAll: boolean,
): { payload: NotificationReadCookiePayload; markedIds: string[] } {
  const payload = parseNotificationReadCookie(request.cookies.get(NOTIFICATION_READ_COOKIE)?.value);
  const existing = new Set(payload.scopes[scope] ?? []);
  const toAdd = markAll ? allItemIds : idsToMark;

  for (const id of toAdd) {
    if (typeof id === "string" && id.trim()) {
      existing.add(id);
    }
  }

  payload.scopes[scope] = [...existing].slice(-MAX_IDS_PER_SCOPE);

  return {
    payload,
    markedIds: toAdd.filter((id) => typeof id === "string" && id.trim()),
  };
}
