import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}/documents`);
  if (proxied) return proxied;
  return previewModeResponse("Knowledge base documents");
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}/documents`);
  if (proxied) return proxied;
  return previewModeResponse("Document upload");
}
