import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { appendAcquisitionSource, resolveAcquisitionSource } from "@/lib/public/acquisition-source";
import { getUpstreamApiBaseUrl } from "@/server/api-config";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Public short-link entry on Console origin → upstream 302 to targetUrl.
 * Merges acquisition `source` onto the Location so WeChat menu params survive the hop.
 * No dashboard login cookies required.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL" },
      { status: 503 },
    );
  }

  const source = resolveAcquisitionSource(request.nextUrl.searchParams);

  const url = new URL(`/public/sales-links/${encodeURIComponent(slug)}`, `${baseUrl}/`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  if (source) url.searchParams.set("source", source);

  const upstream = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "user-agent": request.headers.get("user-agent") ?? "qiyun-console-bff",
      referer: request.headers.get("referer") ?? "",
    },
    cache: "no-store",
  });

  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    const nextLocation = appendAcquisitionSource(location, source);
    return NextResponse.redirect(nextLocation, 302);
  }

  if (upstream.status === 404) {
    return NextResponse.json({ message: "销售链接不存在或已停用" }, { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": contentType, "cache-control": "no-store" },
  });
}
