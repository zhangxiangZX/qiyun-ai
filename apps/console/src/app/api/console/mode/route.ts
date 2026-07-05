import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { getConsoleDataMode, getConsoleModeMessage } from "@/server/data-mode";
import { fetchUpstreamHealth } from "@/server/upstream-health";

export async function GET() {
  const upstreamConfigured = Boolean(getUpstreamApiBaseUrl());
  const health = upstreamConfigured ? await fetchUpstreamHealth() : null;

  const upstreamBaseUrl = getUpstreamApiBaseUrl();

  return NextResponse.json({
    mode: getConsoleDataMode(),
    upstreamConfigured,
    message: getConsoleModeMessage(),
    upstreamBaseUrl: upstreamBaseUrl ?? undefined,
    upstream: health
      ? {
          reachable: health.reachable,
          apiDriver: health.apiDriver,
        }
      : undefined,
  });
}
