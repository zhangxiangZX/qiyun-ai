import type { NextRequest } from "next/server";
import { tryProxy } from "@/server/proxy";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await context.params;
  return (await tryProxy(request, `/follow-tasks/${encodeURIComponent(id)}/${encodeURIComponent(action)}`))!;
}
