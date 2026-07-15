import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { documentApi } from "@/server/documents/instance";
import { toErrorResponse } from "@/server/http-errors";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/documents/${id}/reindex`);
  if (proxied) return proxied;

  try {
    const data = documentApi.reindexDocument(getWorkspaceContext(request), id);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
