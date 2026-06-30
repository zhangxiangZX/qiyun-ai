import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { getWorkspaceContext } from "@/server/workspace";

export async function tryProxy(
  request: NextRequest,
  path: string,
): Promise<NextResponse | null> {
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) return null;

  const url = new URL(path, `${baseUrl}/`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("x-workspace-id", getWorkspaceContext(request).workspaceId);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstream = await fetch(url, init);
  const responseBody = await upstream.text();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function tryProxySse(
  request: NextRequest,
  path: string,
): Promise<Response | null> {
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) return null;

  const url = new URL(path, `${baseUrl}/`);
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("x-workspace-id", getWorkspaceContext(request).workspaceId);

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: await request.text(),
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream",
    },
  });
}

export function previewModeResponse(feature: string): NextResponse {
  return NextResponse.json(
    {
      code: "PREVIEW_MODE",
      message: `Upstream API is not configured. ${feature} is unavailable via BFF until API_BASE_URL is set.`,
    },
    { status: 503 },
  );
}
