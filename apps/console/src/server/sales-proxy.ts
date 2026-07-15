import type { NextRequest } from "next/server";

import { tryProxy } from "@/server/proxy";

export async function proxySalesGet(request: NextRequest, upstreamPath: string) {
  const proxied = await tryProxy(request, upstreamPath);
  if (proxied) return proxied;
  return null;
}

export async function proxySalesMutation(
  request: NextRequest,
  upstreamPath: string,
) {
  return tryProxy(request, upstreamPath);
}
