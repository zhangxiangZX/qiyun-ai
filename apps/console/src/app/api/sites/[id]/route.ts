import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/sites/${id}`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to update sites through apps/api.",
    },
    { status: 503 },
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/sites/${id}`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to delete sites through apps/api.",
    },
    { status: 503 },
  );
}
