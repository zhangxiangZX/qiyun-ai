import { NextRequest, NextResponse } from "next/server";

import { getConsoleAuthApiBaseUrl } from "@/server/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/trial-requests`, {
    method: "POST",
    headers: {
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
