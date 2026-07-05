import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { dashboardWithBots } from "@/lib/dashboard/mock-data";
import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { tryProxy } from "@/server/proxy";

export async function GET(request: NextRequest) {
  if (getUpstreamApiBaseUrl()) {
    try {
      const proxied = await tryProxy(request, "/dashboard");
      if (proxied) return proxied;
    } catch {
      return NextResponse.json(
        { code: "INTERNAL_ERROR", message: "Dashboard upstream unreachable." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Dashboard upstream unavailable." },
      { status: 502 },
    );
  }

  return NextResponse.json(dashboardWithBots);
}
