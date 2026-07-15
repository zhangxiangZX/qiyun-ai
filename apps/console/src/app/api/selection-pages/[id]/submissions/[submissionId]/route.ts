import type { NextRequest } from "next/server"; import { tryProxy } from "@/server/proxy";
export async function GET(request: NextRequest, c: { params: Promise<{ id: string; submissionId: string }> }) { const p = await c.params; return (await tryProxy(request, `/selection-pages/${encodeURIComponent(p.id)}/submissions/${encodeURIComponent(p.submissionId)}`))!; }
