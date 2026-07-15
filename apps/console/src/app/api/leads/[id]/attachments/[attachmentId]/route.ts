import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  const proxied = await tryProxy(request, `/leads/${id}/attachments/${attachmentId}`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to download lead attachments from apps/api.",
    },
    { status: 503 },
  );
}
