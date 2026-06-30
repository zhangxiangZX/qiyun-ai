import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/conversations/${id}`);
  if (proxied) return proxied;
  return previewModeResponse("Conversation detail");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/conversations/${id}`);
  if (proxied) return proxied;
  return previewModeResponse("Conversation metadata update");
}
