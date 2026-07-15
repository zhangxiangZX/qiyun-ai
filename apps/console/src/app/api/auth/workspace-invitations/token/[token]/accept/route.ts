import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  getAuthAccessToken,
  getAuthRefreshToken,
  getConsoleAuthApiBaseUrl,
  setAuthCookies,
  type ConsoleAuthPayload,
} from "@/server/auth-session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
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
  const acceptedUpstream = await fetch(
    `${baseUrl}/workspace-invitations/token/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      headers,
      cache: "no-store",
    },
  );
  const acceptedText = await acceptedUpstream.text();
  if (!acceptedUpstream.ok) {
    return new NextResponse(acceptedText, {
      status: acceptedUpstream.status,
      headers: {
        "content-type": acceptedUpstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const acceptedPayload = unwrapEnvelope<{ workspaceId: string } & Record<string, unknown>>(
    JSON.parse(acceptedText),
  );

  const activateUpstream = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(acceptedPayload.workspaceId)}/activate`,
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

  const refreshPayload = unwrapEnvelope<ConsoleAuthPayload>(JSON.parse(refreshText));
  const response = NextResponse.json(acceptedPayload);
  setAuthCookies(response, refreshPayload);
  return response;
}
