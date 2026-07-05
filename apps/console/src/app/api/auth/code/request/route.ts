import { NextRequest, NextResponse } from "next/server";

import { getConsoleAuthApiBaseUrl } from "@/server/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/auth/code/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    cache: "no-store",
  });

  const responseText = await upstream.text();
  return new NextResponse(responseText, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
