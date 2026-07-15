import { NextRequest, NextResponse } from "next/server";

import { getAuthAccessToken, getConsoleAuthApiBaseUrl } from "@/server/auth-session";

async function proxyPlatformRequest(request: NextRequest, init?: RequestInit) {
  const accessToken = getAuthAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "No active session." }, { status: 401 });
  }

  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/platform/workspaces`, {
    ...init,
    headers: {
      ...init?.headers,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(request: NextRequest) {
  return proxyPlatformRequest(request, { method: "GET" });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyPlatformRequest(request, { method: "POST", body });
}
