import type { NextRequest } from "next/server";

import { previewModeResponse, tryProxy } from "@/server/proxy";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/knowledge-bases");
  if (proxied) return proxied;
  return previewModeResponse("Knowledge bases");
}

export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/knowledge-bases");
  if (proxied) return proxied;
  return previewModeResponse("Knowledge base create");
}
