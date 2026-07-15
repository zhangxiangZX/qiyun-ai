import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { documentApi } from "@/server/documents/instance";
import { toErrorResponse } from "@/server/http-errors";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}`);
  if (proxied) return proxied;

  try {
    const data = documentApi.getKnowledgeBase(getWorkspaceContext(request), id);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}`);
  if (proxied) return proxied;

  try {
    const body = (await request.json()) as {
      name?: string;
      status?: "active" | "disabled";
    };
    const data = documentApi.updateKnowledgeBase(getWorkspaceContext(request), id, body);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}`);
  if (proxied) return proxied;

  try {
    const data = documentApi.deleteKnowledgeBase(getWorkspaceContext(request), id);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
