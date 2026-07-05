import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyAuthRequest(
    request,
    `/workspace-invitations/${encodeURIComponent(id)}/delivery-audits`,
    { requireAuth: true },
  );
}
