import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { applyRefreshedAuthCookies } from "@/server/auth-session";
import {
  buildUpstreamHeaders,
  type UpstreamHeadersOptions,
} from "@/server/upstream-request";

function unauthorizedProxyResponse(): NextResponse {
  return NextResponse.json(
    { code: "UNAUTHORIZED", message: "No active session." },
    { status: 401 },
  );
}

export async function tryProxy(
  request: NextRequest,
  path: string,
  options?: UpstreamHeadersOptions,
): Promise<NextResponse | null> {
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) return null;

  const authHeaders = await buildUpstreamHeaders(request, options);
  if (!authHeaders) {
    return unauthorizedProxyResponse();
  }

  const url = new URL(path, `${baseUrl}/`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers: authHeaders.headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(url, init);
  // Read the upstream body as raw bytes (not text) so binary payloads such as
  // images / PDFs are proxied losslessly instead of being mangled by a UTF-8
  // text decode/re-encode round-trip.
  const responseBuffer = await upstream.arrayBuffer();

  const responseHeaders: Record<string, string> = {
    "content-type": upstream.headers.get("content-type") ?? "application/json",
  };
  // Forward the headers the frontend relies on for the document-center flows:
  // `content-disposition` (download filename) and `x-watermark-applied`
  // (backend signals it returned the original bytes untouched for images/pdf).
  for (const name of ["content-disposition", "x-watermark-applied"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders[name] = value;
  }

  const response = new NextResponse(responseBuffer, {
    status: upstream.status,
    headers: responseHeaders,
  });

  if (authHeaders.refreshed) {
    applyRefreshedAuthCookies(response, authHeaders.refreshed);
  }

  return response;
}
