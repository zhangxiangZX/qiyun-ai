import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isPreviewDataMode } from "@/server/data-mode";
import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/sites/${id}/rotate-key`);
  if (proxied) return proxied;

  if (isPreviewDataMode()) {
    return NextResponse.json(
      {
        code: "PREVIEW_MODE",
        message: "Preview mode: site key rotation is simulated locally.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { code: "UPSTREAM_REQUIRED", message: "Configure API_BASE_URL to rotate site keys." },
    { status: 503 },
  );
}
