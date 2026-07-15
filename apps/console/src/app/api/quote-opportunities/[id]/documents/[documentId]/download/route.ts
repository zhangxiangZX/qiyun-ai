import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { tryProxy } from "@/server/proxy";

interface RouteContext { params: Promise<{ id: string; documentId: string }>; }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id, documentId } = await context.params;
  const proxied = await tryProxy(
    request,
    `/quote-opportunities/${id}/documents/${documentId}/download`,
  );
  if (proxied) return proxied;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
