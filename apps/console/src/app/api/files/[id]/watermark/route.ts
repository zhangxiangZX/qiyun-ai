import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";
import {
  buildPlaceholderBlob,
  getPreviewBlob,
  getPreviewDocument,
} from "@/lib/documents/mock-data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Upstream: proxy to the backend watermark service (apps/api GET /files/:id/watermark).
  const proxied = await tryProxy(request, `/files/${id}/watermark`);
  if (proxied) return proxied;

  // Preview: return the original file. The client applies a canvas watermark
  // for images; PDF / office docs show a note that the backend generates the
  // real watermark in upstream mode.
  const item = getPreviewDocument(id);
  if (!item) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "文档不存在。" },
      { status: 404 },
    );
  }

  const blob = getPreviewBlob(id) ?? buildPlaceholderBlob(item);
  return new NextResponse(blob, {
    headers: {
      "content-type": blob.type || item.mimeType || "application/octet-stream",
      "content-disposition": `attachment; filename="${encodeURIComponent(item.name)}"`,
      "x-watermark-mode": "preview",
    },
  });
}
