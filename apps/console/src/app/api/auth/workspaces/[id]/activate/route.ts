import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getAuthAccessToken,
  getAuthRefreshToken,
  getConsoleAuthApiBaseUrl,
  setAuthCookies,
  type ConsoleAuthPayload,
} from "@/server/auth-session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const accessToken = getAuthAccessToken(request);
  const refreshToken = getAuthRefreshToken(request);

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "No active session." },
      { status: 401 },
    );
  }

  const headers = new Headers({
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  });

  const baseUrl = getConsoleAuthApiBaseUrl();
  const activateUpstream = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(id)}/activate`,
    {
      method: "POST",
      headers,
      cache: "no-store",
    },
  );

  if (!activateUpstream.ok) {
    return new NextResponse(await activateUpstream.text(), {
      status: activateUpstream.status,
      headers: {
        "content-type": activateUpstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const refreshUpstream = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  const refreshText = await refreshUpstream.text();

  if (!refreshUpstream.ok) {
    return new NextResponse(refreshText, {
      status: refreshUpstream.status,
      headers: {
        "content-type": refreshUpstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const payload = JSON.parse(refreshText) as ConsoleAuthPayload;
  const response = NextResponse.json({
    authenticated: true,
    user: payload.user,
    workspaces: payload.workspaces,
  });
  setAuthCookies(response, payload);
  return response;
}
