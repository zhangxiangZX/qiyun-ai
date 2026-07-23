import type { NextRequest } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/quote-opportunities/${id}/attachments`);
  return proxied!;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/quote-opportunities/${id}/attachments`);
  return proxied!;
}
