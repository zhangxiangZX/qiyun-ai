import type { NextRequest } from "next/server";
import { tryProxy } from "@/server/proxy";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; return (await tryProxy(request, `/sites/${encodeURIComponent(id)}/check-install`))!;
}
