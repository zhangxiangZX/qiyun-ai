import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { runtime } from "@/server/runtime";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";
import { toChatErrorResponse } from "@/server/chat-http";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function findBotFromUpstreamList(request: NextRequest, id: string): Promise<NextResponse | null> {
  // Compatibility fallback when upstream GET /bots/:id is unavailable.
  const listProxied = await tryProxy(request, "/bots");
  if (!listProxied?.ok) {
    return listProxied;
  }

  try {
    const bots = JSON.parse(await listProxied.text()) as Array<{ id: string }>;
    const bot = bots.find((item) => item.id === id);
    if (!bot) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Bot not found." }, { status: 404 });
    }
    return NextResponse.json(bot);
  } catch {
    return NextResponse.json({ code: "PROVIDER_ERROR", message: "Invalid bots list response." }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/bots/${id}`);

  if (proxied && proxied.status < 400) {
    return proxied;
  }

  if (getUpstreamApiBaseUrl()) {
    if (proxied?.status === 404) {
      const fromList = await findBotFromUpstreamList(request, id);
      if (fromList) return fromList;
    }
    if (proxied) return proxied;
    return NextResponse.json({ code: "NOT_FOUND", message: "Bot not found." }, { status: 404 });
  }

  try {
    const workspaceId = getWorkspaceContext(request).workspaceId;
    const bot = runtime.ragService.listBots(workspaceId).find((item) => item.id === id);
    if (!bot) {
      return Response.json({ code: "NOT_FOUND", message: "Bot not found." }, { status: 404 });
    }
    return Response.json(bot);
  } catch (error) {
    return toChatErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/bots/${id}`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "PREVIEW_MODE",
      message: "Configure API_BASE_URL to save bots to apps/api.",
    },
    { status: 503 },
  );
}
