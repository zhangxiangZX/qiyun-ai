import { NextRequest, NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  applyNotificationReadState,
  mergeReadIds,
  writeNotificationReadCookie,
} from "@/lib/notifications/read-state";
import { loadNotificationFeedForMutation } from "@/server/notifications-feed";
import { getAuthAccessToken, getConsoleAuthApiBaseUrl } from "@/server/auth-session";

export async function POST(request: NextRequest) {
  let body: { ids?: unknown; all?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown; all?: unknown };
  } catch {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "请求体必须是 JSON。" },
      { status: 400 },
    );
  }

  const markAll = body.all === true;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (!markAll && ids.length === 0) {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "请提供 ids 或 all: true。" },
      { status: 400 },
    );
  }

  const accessToken = getAuthAccessToken(request);
  const upstreamBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (accessToken && upstreamBase) {
    try {
      const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/notifications/read`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ ids, all: markAll }),
        cache: "no-store",
      });

      if (upstream.ok) {
        const payload = unwrapEnvelope<Record<string, unknown>>(await upstream.json());
        return NextResponse.json({
          ...payload,
          readPersistence: "upstream",
        });
      }

      if (upstream.status !== 404 && upstream.status !== 501) {
        return NextResponse.json(
          { code: "UPSTREAM_ERROR", message: "通知已读同步失败。" },
          { status: 502 },
        );
      }
    } catch {
      return NextResponse.json(
        { code: "UPSTREAM_UNREACHABLE", message: "无法连接通知服务。" },
        { status: 503 },
      );
    }
  }

  try {
    const { feed } = await loadNotificationFeedForMutation(request);
    const scope = feed.readStateScope;
    const allItemIds = feed.items.map((item) => item.id);
    const { payload, markedIds } = mergeReadIds(request, scope, ids, allItemIds, markAll);
    const readIds = new Set(payload.scopes[scope] ?? []);
    const { unreadCount } = applyNotificationReadState(feed.items, readIds);

    const response = NextResponse.json({
      ok: true,
      markedIds,
      unreadCount,
      readStateScope: scope,
      readPersistence: "bff-cookie",
    });
    writeNotificationReadCookie(response, payload);
    return response;
  } catch {
    return NextResponse.json(
      { code: "UPSTREAM_ERROR", message: "通知服务暂不可用。" },
      { status: 502 },
    );
  }
}
