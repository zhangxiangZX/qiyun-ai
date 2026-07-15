import { NextRequest, NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import { getUpstreamApiBaseUrl } from "@/server/api-config";
import {
  setAuthCookies,
  type ConsoleAuthPayload,
} from "@/server/auth-session";
import { buildUpstreamHeaders } from "@/server/upstream-request";

export async function POST(request: NextRequest) {
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { code: "PREVIEW_MODE", message: "预览模式下不支持修改密码，已切换为本地演示。" },
      { status: 503 },
    );
  }

  const headersResult = await buildUpstreamHeaders(request, { requireAuth: true });
  if (!headersResult) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "No active session." },
      { status: 401 },
    );
  }

  const body = await request.text();
  const upstream = await fetch(`${baseUrl}/auth/change-password`, {
    method: "POST",
    headers: headersResult.headers,
    body,
    cache: "no-store",
  });

  const responseText = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const payload = unwrapEnvelope<ConsoleAuthPayload>(JSON.parse(responseText));
  const response = NextResponse.json({
    authenticated: true,
    user: payload.user,
    workspaces: payload.workspaces,
  });
  setAuthCookies(response, payload);
  return response;
}
