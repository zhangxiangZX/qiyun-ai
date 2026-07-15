import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/sales-assistant/analyze");
  if (proxied) return proxied;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
