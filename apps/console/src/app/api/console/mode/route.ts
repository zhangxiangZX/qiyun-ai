import { NextResponse } from "next/server";

import { getConsoleDataMode, isUpstreamDataMode } from "@/server/data-mode";
import { getUpstreamApiBaseUrl } from "@/server/api-config";

export async function GET() {
  const upstreamConfigured = Boolean(getUpstreamApiBaseUrl());

  return NextResponse.json({
    mode: getConsoleDataMode(),
    upstreamConfigured,
    message: isUpstreamDataMode()
      ? "Connected to upstream API (apps/api) via BFF proxy."
      : "Preview mode: using client demo data. Set API_BASE_URL to connect apps/api.",
  });
}
