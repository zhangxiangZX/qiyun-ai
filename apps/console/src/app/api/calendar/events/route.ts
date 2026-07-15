import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";
import { listCalendarEventsMock } from "@/lib/calendar/mock-data";

export async function GET(request: NextRequest) {
  // 上游模式：代理至 apps/api GET /calendar/events（由 Codex 实现，Task #8）。
  const proxied = await tryProxy(request, "/calendar/events");
  if (proxied) return proxied;

  // 演示模式（无 API_BASE_URL）：返回演示事件，保证 V2 预览可演示。
  const { searchParams } = new URL(request.url);
  const from =
    searchParams.get("from") ??
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const to =
    searchParams.get("to") ??
    new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0, 23, 59, 59).toISOString();

  return NextResponse.json({ events: listCalendarEventsMock(from, to) });
}

export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/calendar/events");
  if (proxied) return proxied;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
