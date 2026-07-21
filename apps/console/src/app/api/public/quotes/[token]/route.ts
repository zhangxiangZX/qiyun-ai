import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/** Public quote JSON — no dashboard login required. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const proxied = await tryProxy(request, `/public/quotes/${encodeURIComponent(token)}`, {
    requireAuth: false,
  });
  if (proxied) return proxied;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
