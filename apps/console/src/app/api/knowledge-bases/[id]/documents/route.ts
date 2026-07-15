import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { documentApi } from "@/server/documents/instance";
import { readUploadBody } from "@/server/documents/upload-body";
import { toErrorResponse } from "@/server/http-errors";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}/documents`);
  if (proxied) return proxied;

  try {
    const data = documentApi.listKnowledgeBaseDocuments(getWorkspaceContext(request), id);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/knowledge-bases/${id}/documents`);
  if (proxied) return proxied;

  try {
    const files = await readUploadBody(request);
    const data = documentApi.uploadDocuments(
      getWorkspaceContext(request),
      id,
      files.map((file) => ({
        fileName: file.fileName,
        fileType: file.fileType,
        sizeBytes: file.sizeBytes,
        contentBytes: file.contentBytes,
      })),
    );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
