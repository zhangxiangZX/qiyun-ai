import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyAuthRequest(request, `/workspaces/${encodeURIComponent(id)}`, {
    requireAuth: true,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyAuthRequest(request, `/workspaces/${encodeURIComponent(id)}`, {
    requireAuth: true,
    method: "PATCH",
    body,
  });
}
