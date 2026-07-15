import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";

// Widget 预上传线索附件（公开，无需登录）。字节透传，避免大文件在 BFF 层被文本化。
export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/public/leads/attachments", { requireAuth: false });
  if (proxied) return proxied;
  return NextResponse.json({ code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL。" }, { status: 503 });
}
