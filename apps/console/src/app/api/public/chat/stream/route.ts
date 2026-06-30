import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxySse } from "@/server/proxy";

export async function POST(request: NextRequest) {
  const proxied = await tryProxySse(request, "/public/chat/stream");
  if (proxied) return proxied;
  return previewModeResponse("Public chat stream");
}
