import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/bots/${id}/embed-code`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to get embed code from apps/api.",
    },
    { status: 503 },
  );
}
