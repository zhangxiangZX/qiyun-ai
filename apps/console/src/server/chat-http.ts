import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { applyRefreshedAuthCookies } from "@/server/auth-session";
import { toChatHttpError } from "@/server/chat/chat.api";
import {
  buildUpstreamHeaders,
  type UpstreamHeadersOptions,
} from "@/server/upstream-request";

export function toChatErrorResponse(error: unknown): NextResponse {
  const mapped = toChatHttpError(error);
  return NextResponse.json(
    { code: mapped.code, message: mapped.message },
    { status: mapped.statusCode },
  );
}

export function formatSse(events: Array<{ event: string; data: unknown }>): string {
  return events.map((item) => `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`).join("");
}

export async function tryProxySse(
  request: NextRequest,
  path: string,
  options?: UpstreamHeadersOptions,
): Promise<Response | null> {
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) return null;

  const authHeaders = await buildUpstreamHeaders(request, { requireAuth: false, ...options });
  if (!authHeaders) {
    return new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "No active session." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(path, `${baseUrl}/`);

  const upstream = await fetch(url, {
    method: request.method,
    headers: authHeaders.headers,
    body: await request.text(),
    cache: "no-store",
  });

  const downstream = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream",
    },
  });

  if (authHeaders.refreshed) {
    applyRefreshedAuthCookies(downstream, authHeaders.refreshed);
  }

  return downstream;
}
