import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxy = await tryProxy(request, `/follow-tasks/${id}`);
  if (proxy) return proxy;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxy = await tryProxy(request, `/follow-tasks/${id}`);
  if (proxy) return proxy;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
