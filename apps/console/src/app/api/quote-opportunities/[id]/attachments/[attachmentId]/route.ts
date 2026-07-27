import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  const proxied = await tryProxy(
    request,
    `/quote-opportunities/${id}/attachments/${attachmentId}`,
  );
  if (proxied) return proxied;
  return NextResponse.json(
    { code: "NOT_AVAILABLE", message: "需要配置 API_BASE_URL。" },
    { status: 503 },
  );
}
