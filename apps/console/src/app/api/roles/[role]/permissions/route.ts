import type { NextRequest } from "next/server"; import { tryProxy } from "@/server/proxy";
export async function GET(request: NextRequest, c: { params: Promise<{ role: string }> }) { const { role } = await c.params; return (await tryProxy(request, `/roles/${encodeURIComponent(role)}/permissions`))!; }
export async function PATCH(request: NextRequest, c: { params: Promise<{ role: string }> }) { const { role } = await c.params; return (await tryProxy(request, `/roles/${encodeURIComponent(role)}/permissions`))!; }
