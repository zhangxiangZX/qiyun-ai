import { NextResponse } from "next/server";

import { getPublishedSelectionPageConfig, saveSelectionPageConfig } from "@/lib/channels/ai-selection-page-store";
import type { SelectionPagePublicConfig } from "@/lib/channels/ai-selection-page-config";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const config = getPublishedSelectionPageConfig(slug);

  if (!config) {
    return NextResponse.json({ message: "选型页不存在或未发布。" }, { status: 404 });
  }

  if (!config.enabled || !config.published) {
    return NextResponse.json({ message: "选型页暂未开放访问。" }, { status: 403 });
  }

  return NextResponse.json(config);
}

export async function PUT(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body = (await request.json()) as SelectionPagePublicConfig;

  if (body.slug !== slug) {
    return NextResponse.json({ message: "slug 不匹配。" }, { status: 400 });
  }

  const saved = saveSelectionPageConfig(body);
  return NextResponse.json(saved);
}
