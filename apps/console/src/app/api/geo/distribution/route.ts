import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";
import { getRegionCenter, listRegionsMock } from "@/lib/geo/mock-data";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/geo/distribution");
  if (proxied) return proxied;

  return NextResponse.json({
    regions: listRegionsMock(),
    center: getRegionCenter(),
  });
}
