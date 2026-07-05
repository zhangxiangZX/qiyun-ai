import type { NextRequest } from "next/server";

import { proxyAuthRequest } from "@/server/auth-proxy";

export async function GET(request: NextRequest) {
  return proxyAuthRequest(request, "/workspace-invitations", {
    requireAuth: true,
  });
}
