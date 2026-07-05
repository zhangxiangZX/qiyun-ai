import { NextRequest, NextResponse } from "next/server";

import {
  getConsoleAuthApiBaseUrl,
  setAuthCookies,
  type ConsoleAuthPayload,
} from "@/server/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
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

  const payload = JSON.parse(responseText) as ConsoleAuthPayload;
  const response = NextResponse.json({
    authenticated: true,
    user: payload.user,
    workspaces: payload.workspaces,
  });
  setAuthCookies(response, payload);
  return response;
}
