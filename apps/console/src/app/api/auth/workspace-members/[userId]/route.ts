import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;

  return proxyAuthRequest(request, `/workspace-members/${encodeURIComponent(userId)}`, {
    requireAuth: true,
    method: "PATCH",
    body: await request.text(),
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;

  return proxyAuthRequest(request, `/workspace-members/${encodeURIComponent(userId)}`, {
    requireAuth: true,
    method: "DELETE",
  });
}
