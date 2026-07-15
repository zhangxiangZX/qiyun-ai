import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { tryProxy } from "@/server/proxy";

export async function GET(
  request: NextRequest,
  c: { params: Promise<{ id: string; submissionId: string; action: string }> },
) {
  const p = await c.params;
  const proxy = await tryProxy(
    request,
    `/selection-pages/${encodeURIComponent(p.id)}/submissions/${encodeURIComponent(p.submissionId)}/${encodeURIComponent(p.action)}`,
  );
  if (proxy) return proxy;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}

export async function POST(
  request: NextRequest,
  c: { params: Promise<{ id: string; submissionId: string; action: string }> },
) {
  const p = await c.params;
  return (await tryProxy(
    request,
    `/selection-pages/${encodeURIComponent(p.id)}/submissions/${encodeURIComponent(p.submissionId)}/${encodeURIComponent(p.action)}`,
  ))!;
}
