import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  return proxyAuthRequest(
    request,
    `/workspace-invitations/token/${encodeURIComponent(token)}`,
  );
}
