import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getConsoleAuthApiBaseUrl, getAuthAccessToken } from "@/server/auth-session";

export async function proxyAuthRequest(
  request: NextRequest,
  path: string,
  options?: {
    requireAuth?: boolean;
    method?: string;
    body?: string;
  },
) {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  if (options?.requireAuth) {
    const accessToken = getAuthAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "No active session." },
        { status: 401 },
      );
    }
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}${path}`, {
    method: options?.method ?? request.method,
    headers,
    body: options?.body,
    cache: "no-store",
  });

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
