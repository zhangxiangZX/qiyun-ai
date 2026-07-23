import type { NextRequest } from "next/server";

import { tryProxy } from "@/server/proxy";

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  const proxied = await tryProxy(
    request,
    `/quote-opportunities/${id}/attachments/${attachmentId}/download`,
  );
  return proxied!;
}
