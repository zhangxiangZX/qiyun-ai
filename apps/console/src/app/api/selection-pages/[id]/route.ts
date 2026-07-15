import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { tryProxy } from "@/server/proxy";
interface RouteContext { params: Promise<{ id: string }>; }
export async function GET(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params; const p = await tryProxy(request, `/selection-pages/${id}`); if (p) return p;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params; const p = await tryProxy(request, `/selection-pages/${id}`); if (p) return p;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params; const p = await tryProxy(request, `/selection-pages/${id}`); if (p) return p;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
