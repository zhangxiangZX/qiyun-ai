import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function proxyAttachments(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/quote-opportunities/${id}/attachments`);
  if (proxied) return proxied;
  return NextResponse.json(
    { code: "NOT_AVAILABLE", message: "需要配置 API_BASE_URL。" },
    { status: 503 },
  );
}

export const GET = proxyAttachments;
export const POST = proxyAttachments;
