import type { NextRequest } from "next/server";
import { tryProxy } from "@/server/proxy";
export async function POST(request: NextRequest) { return (await tryProxy(request, "/reports/export"))!; }
