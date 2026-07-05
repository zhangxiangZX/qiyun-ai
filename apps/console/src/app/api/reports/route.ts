import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/reports");
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "PREVIEW_MODE",
      message: "Report analytics is only available when API_BASE_URL is configured.",
    },
    { status: 503 },
  );
}
