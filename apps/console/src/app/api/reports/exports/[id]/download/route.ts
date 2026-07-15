import type { NextRequest } from "next/server"; import { tryProxy } from "@/server/proxy";
export async function GET(request: NextRequest, c: { params: Promise<{ id: string }> }) { const { id } = await c.params; return (await tryProxy(request, `/reports/exports/${encodeURIComponent(id)}/download`))!; }
