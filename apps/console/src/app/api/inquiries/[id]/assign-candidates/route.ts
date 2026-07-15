import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/inquiries/${encodeURIComponent(id)}/assign-candidates`);
  if (proxied) return proxied;
  return NextResponse.json(
    { code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" },
    { status: 503 },
  );
}
