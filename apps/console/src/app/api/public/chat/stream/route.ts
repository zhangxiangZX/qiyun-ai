import type { NextRequest } from "next/server";

import type { ChatStreamRequest } from "@/server/chat/chat.types";
import { publicChatApi } from "@/server/runtime";
import { formatSse, toChatErrorResponse, tryProxySse } from "@/server/chat-http";

export async function POST(request: NextRequest) {
  const proxied = await tryProxySse(request, "/public/chat/stream", { requireAuth: false });
  if (proxied) return proxied;

  try {
    const body = (await request.json()) as ChatStreamRequest;
    const result = await publicChatApi.stream(body);

    return new Response(formatSse(result.events), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const response = toChatErrorResponse(error);
    const payload = await response.json();
    return Response.json(payload, { status: response.status });
  }
}
