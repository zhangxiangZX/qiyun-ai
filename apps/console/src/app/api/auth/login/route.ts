import { NextRequest, NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  getConsoleAuthApiBaseUrl,
  setAuthCookies,
  type ConsoleAuthPayload,
} from "@/server/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/auth/login`, {
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

  const payload = unwrapEnvelope<ConsoleAuthPayload>(JSON.parse(responseText));
  const response = NextResponse.json({
    authenticated: true,
    user: payload.user,
    workspaces: payload.workspaces,
  });
  setAuthCookies(response, payload);
  return response;
}
