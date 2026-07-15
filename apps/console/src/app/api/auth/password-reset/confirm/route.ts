import { NextRequest, NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import { getConsoleAuthApiBaseUrl } from "@/server/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/auth/password-reset/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    cache: "no-store",
  });

  const responseText = await upstream.text();
  // 上游返回 { code, message, data } 信封，BFF 透传给浏览器前先解包 data，
  // 保持与登录/注册等自定义响应一致的「干净数据」契约。
  if (!upstream.ok) {
    return new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const data = unwrapEnvelope(JSON.parse(responseText));
  return NextResponse.json(data, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
