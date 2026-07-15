import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

// 公开下载预上传的线索附件（pending id 不可猜测，作为安全边界）。字节透传。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxied = await tryProxy(request, `/public/leads/attachments/${id}`, { requireAuth: false });
  if (proxied) return proxied;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
