import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxy } from "@/server/proxy";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/conversations");
  if (proxied) return proxied;
  return previewModeResponse("Conversations list");
}
