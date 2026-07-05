import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return proxyAuthRequest(request, `/workspaces/${encodeURIComponent(id)}/transfer-owner`, {
    requireAuth: true,
    method: "POST",
    body: await request.text(),
  });
}
