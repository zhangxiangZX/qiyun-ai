import { NextRequest, NextResponse } from "next/server";

import { getAuthAccessToken, getConsoleAuthApiBaseUrl } from "@/server/auth-session";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = getAuthAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "No active session." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.text();
  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/platform/trial-requests/${id}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body,
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
