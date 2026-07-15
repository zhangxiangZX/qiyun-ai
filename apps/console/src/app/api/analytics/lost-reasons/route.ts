import type { NextRequest } from "next/server"; import { tryProxy } from "@/server/proxy";
export async function GET(request: NextRequest) { return (await tryProxy(request, "/analytics/lost-reasons"))!; }
