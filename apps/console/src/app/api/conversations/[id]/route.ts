import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { mapConversationDetail } from "@/server/chat/console-mapper";
import { upsertConversationMeta } from "@/server/chat/conversation-meta";
import { isPreviewDataMode } from "@/server/data-mode";
import { runtime } from "@/server/runtime";
import { tryProxy } from "@/server/proxy";
import { getWorkspaceContext } from "@/server/workspace";
import { toChatErrorResponse } from "@/server/chat-http";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/conversations/${id}`);
  if (proxied) return proxied;

  try {
    const detail = await runtime.publicChatApi.getConversation(getWorkspaceContext(request), id);
    const mapped = await mapConversationDetail(
      detail,
      runtime.chatRepository,
      runtime.ragRepository,
    );
    return NextResponse.json(mapped);
  } catch (error) {
    return toChatErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/conversations/${id}`);
  if (proxied) return proxied;

  if (isPreviewDataMode()) {
    return NextResponse.json(
      {
        code: "PREVIEW_MODE",
        message:
          "Upstream API is not configured. Conversation metadata cannot be saved in preview mode.",
      },
      { status: 503 },
    );
  }

  try {
    const workspace = getWorkspaceContext(request);
    await runtime.publicChatApi.getConversation(workspace, id);
    const body = (await request.json()) as {
      status?: "open" | "resolved" | "unresolved" | "pending";
      tags?: string[];
      assignee?: string | null;
    };

    upsertConversationMeta(id, {
      status: body.status,
      tags: body.tags,
      assignee: body.assignee,
    });

    const detail = await runtime.publicChatApi.getConversation(workspace, id);
    const mapped = await mapConversationDetail(
      detail,
      runtime.chatRepository,
      runtime.ragRepository,
    );
    return NextResponse.json(mapped);
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
