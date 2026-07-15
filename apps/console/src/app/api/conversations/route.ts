import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { mapConversationSummary } from "@/server/chat/console-mapper";
import { runtime } from "@/server/runtime";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";
import { toChatErrorResponse } from "@/server/chat-http";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/conversations");
  if (proxied) return proxied;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitValue = searchParams.get("limit");
    const cursor = searchParams.get("cursor") ?? undefined;
    const parsedLimit = limitValue ? Number(limitValue) : undefined;
    const limit =
      parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.floor(parsedLimit)
        : undefined;

    const result = await runtime.publicChatApi.listConversations(
      getWorkspaceContext(request),
      limit ? { limit, cursor } : undefined,
    );
    const items = await Promise.all(
      result.items.map((summary) =>
        mapConversationSummary(summary, runtime.chatRepository, runtime.ragRepository),
      ),
    );

    if (limit) {
      return NextResponse.json({
        items,
        nextCursor: result.nextCursor,
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
