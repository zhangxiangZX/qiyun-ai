import type { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/server/auth-proxy";

export async function GET(request: NextRequest) {
  return proxyAuthRequest(request, "/workspaces/current", { requireAuth: true });
}
