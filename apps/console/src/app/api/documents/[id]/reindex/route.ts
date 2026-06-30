import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/documents/${id}/reindex`);
  if (proxied) return proxied;
  return previewModeResponse("Document reindex");
}
