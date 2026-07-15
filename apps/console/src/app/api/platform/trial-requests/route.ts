import { NextRequest, NextResponse } from "next/server";

import { getAuthAccessToken, getConsoleAuthApiBaseUrl } from "@/server/auth-session";

export async function GET(request: NextRequest) {
  const accessToken = getAuthAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "No active session." }, { status: 401 });
  }

  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/platform/trial-requests`, {
    method: "GET",
    headers: {
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
