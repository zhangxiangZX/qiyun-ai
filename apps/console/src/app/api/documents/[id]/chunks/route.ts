import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { toErrorResponse } from "@/server/http-errors";
import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/documents/${id}/chunks`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "NOT_AVAILABLE",
      message: "切分块预览需要连接上游 API（配置 API_BASE_URL）。",
    },
    { status: 503 },
  );
}
