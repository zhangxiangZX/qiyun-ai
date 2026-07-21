import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { runtime } from "@/server/runtime";
import { getWorkspaceContext } from "@/server/workspace";
import {
  resolvePreviewOrigin,
  resolveUpstreamPreviewBotContext,
} from "@/server/preview-bot-upstream";

interface RouteContext {
  params: Promise<{ botId: string }>;
}

function mapBotStatus(status: "enabled" | "disabled" | "draft"): "active" | "disabled" | "draft" {
  if (status === "enabled") return "active";
  if (status === "disabled") return "disabled";
  return "draft";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { botId } = await context.params;

  if (getUpstreamApiBaseUrl()) {
    try {
      const payload = await resolveUpstreamPreviewBotContext(request, botId);
      return NextResponse.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return NextResponse.json({ code: "INTERNAL_ERROR", message }, { status: 500 });
    }
  }

  try {
    const workspace = getWorkspaceContext(request);
    const site = await runtime.publicChatApi.getPreviewSite(workspace, botId);

    if (!site) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Preview site not found for bot." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      botId,
      siteKey: site.siteKey,
      origin: resolvePreviewOrigin(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ code: "INTERNAL_ERROR", message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { botId } = await context.params;

  if (getUpstreamApiBaseUrl()) {
    try {
      const body = (await request.json()) as {
        name: string;
        status: "enabled" | "disabled" | "draft";
        knowledgeBaseIds: string[];
      };
      const payload = await resolveUpstreamPreviewBotContext(request, botId, body);
      return NextResponse.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      return NextResponse.json({ code: "INTERNAL_ERROR", message }, { status: 500 });
    }
  }

  try {
    const workspace = getWorkspaceContext(request);
    const body = (await request.json()) as {
      name: string;
      status: "enabled" | "disabled" | "draft";
      knowledgeBaseIds: string[];
    };

    const validKnowledgeBaseIds = body.knowledgeBaseIds.filter((knowledgeBaseId) => {
      try {
        runtime.documentService.getKnowledgeBase(workspace.workspaceId, knowledgeBaseId);
        return true;
      } catch {
        return false;
      }
    });

    runtime.ragService.upsertBot({
      id: botId,
      workspaceId: workspace.workspaceId,
      name: body.name,
      status: mapBotStatus(body.status),
      knowledgeBaseIds: validKnowledgeBaseIds,
    });

    const site = await runtime.publicChatApi.getPreviewSite(workspace, botId);

    return NextResponse.json({
      botId,
      siteKey: site?.siteKey ?? `pk_preview_${botId}`,
      origin: resolvePreviewOrigin(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ code: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
