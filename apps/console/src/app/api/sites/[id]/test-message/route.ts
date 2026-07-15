import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/sites/${id}/test-message`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to test messages against the live API.",
    },
    { status: 503 },
  );
}
