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
  const proxied = await tryProxy(request, `/documents/${id}`);
  if (proxied) return proxied;

  try {
    const data = documentApi.getDocument(getWorkspaceContext(request), id);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/documents/${id}`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "NOT_AVAILABLE",
      message: "单文档删除需要连接上游 API（配置 API_BASE_URL）。",
    },
    { status: 503 },
  );
}
