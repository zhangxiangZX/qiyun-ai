import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import { getPublishedSelectionPageConfig } from "@/lib/channels/ai-selection-page-store";
import {
  mapApiSelectionPageToPublicConfig,
  type ApiSelectionPagePublicPayload,
} from "@/lib/channels/map-api-selection-page-to-public-config";
import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const proxied = await tryProxy(request, `/public/selection-pages/${encodeURIComponent(slug)}`, {
    requireAuth: false,
  });

  if (proxied) {
    if (proxied.status === 200) {
      try {
        const body = await proxied.json();
        const page = unwrapEnvelope<ApiSelectionPagePublicPayload>(body);
        if (!page?.slug) {
          return NextResponse.json({ message: "选型页数据无效。" }, { status: 502 });
        }
        const config = mapApiSelectionPageToPublicConfig(page);
        if (!config.enabled || !config.published) {
          return NextResponse.json({ message: "选型页暂未开放访问。" }, { status: 403 });
        }
        return NextResponse.json(config);
      } catch {
        return NextResponse.json({ message: "选型页解析失败。" }, { status: 502 });
      }
    }

    if (proxied.status === 403) {
      return NextResponse.json({ message: "选型页暂未开放访问。" }, { status: 403 });
    }

    // The upstream is authoritative in production. Never turn its 404 into a
    // local demo page.
    return proxied;
  }

  const config = getPublishedSelectionPageConfig(slug);

  if (!config) {
    return NextResponse.json({ message: "选型页不存在或未发布。" }, { status: 404 });
  }

  if (!config.enabled || !config.published) {
    return NextResponse.json({ message: "选型页暂未开放访问。" }, { status: 403 });
  }

  return NextResponse.json(config);
}
