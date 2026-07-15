import { NextRequest, NextResponse } from "next/server";

import { loadNotificationFeed } from "@/server/notifications-feed";

export async function GET(request: NextRequest) {
  const { feed, upstreamError } = await loadNotificationFeed(request);

  if (upstreamError === "UPSTREAM_ERROR") {
    return NextResponse.json(
      { code: "UPSTREAM_ERROR", message: "通知服务暂不可用。" },
      { status: 502 },
    );
  }

  if (upstreamError === "UPSTREAM_UNREACHABLE") {
    return NextResponse.json(
      { code: "UPSTREAM_UNREACHABLE", message: "无法连接通知服务。" },
      { status: 503 },
    );
  }

  return NextResponse.json(feed);
}
