import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function findLeadFromUpstreamList(
  request: NextRequest,
  id: string,
): Promise<NextResponse | null> {
  // Compatibility fallback when upstream GET /leads/:id is unavailable.
  const listProxied = await tryProxy(request, "/leads");
  if (!listProxied?.ok) {
    return listProxied;
  }

  try {
    const leads = JSON.parse(await listProxied.text()) as Array<{ id: string }>;
    const lead = leads.find((item) => item.id === id);
    if (!lead) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Lead not found." }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json(
      { code: "PROVIDER_ERROR", message: "Invalid leads list response." },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/leads/${id}`);

  if (proxied && proxied.status < 400) {
    return proxied;
  }

  if (getUpstreamApiBaseUrl()) {
    if (proxied?.status === 404) {
      const fromList = await findLeadFromUpstreamList(request, id);
      if (fromList) return fromList;
    }
    if (proxied) return proxied;
    return NextResponse.json({ code: "NOT_FOUND", message: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to load lead detail from apps/api.",
    },
    { status: 503 },
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const proxied = await tryProxy(request, `/leads/${id}`);
  if (proxied) return proxied;

  return NextResponse.json(
    {
      code: "UPSTREAM_REQUIRED",
      message: "Configure API_BASE_URL to update leads via apps/api.",
    },
    { status: 503 },
  );
}
