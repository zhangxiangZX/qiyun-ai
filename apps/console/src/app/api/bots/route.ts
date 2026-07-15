import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { runtime } from "@/server/runtime";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";
import { toChatErrorResponse } from "@/server/chat-http";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/bots");
  if (proxied) return proxied;

  try {
    const bots = runtime.ragService.listBots(getWorkspaceContext(request).workspaceId);
    return NextResponse.json(bots);
  } catch (error) {
    return toChatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/bots");
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "PREVIEW_MODE",
      message: "Configure API_BASE_URL to create bots via apps/api.",
    },
    { status: 503 },
  );
}
