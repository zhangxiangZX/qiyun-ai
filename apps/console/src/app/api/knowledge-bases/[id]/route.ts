import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}`);
  if (proxied) return proxied;
  return previewModeResponse("Knowledge base detail");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}`);
  if (proxied) return proxied;
  return previewModeResponse("Knowledge base update");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}`);
  if (proxied) return proxied;
  return previewModeResponse("Knowledge base delete");
}
