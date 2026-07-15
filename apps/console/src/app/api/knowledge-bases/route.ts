import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { documentApi } from "@/server/documents/instance";
import { toErrorResponse } from "@/server/http-errors";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/knowledge-bases");
  if (proxied) return proxied;

  try {
    const data = documentApi.listKnowledgeBases(getWorkspaceContext(request));
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/knowledge-bases");
  if (proxied) return proxied;

  try {
    const body = (await request.json()) as { name?: string };
    const data = documentApi.createKnowledgeBase(getWorkspaceContext(request), {
      name: body.name ?? "",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
