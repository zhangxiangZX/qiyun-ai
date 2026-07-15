import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function GET(request: NextRequest) {
  return proxyAuthRequest(request, "/workspace-invitations", {
    requireAuth: true,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyAuthRequest(request, "/workspace-invitations", {
    requireAuth: true,
    method: "POST",
    body,
  });
}
