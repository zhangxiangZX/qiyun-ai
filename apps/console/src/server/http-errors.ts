import { NextResponse } from "next/server";

import { toHttpError } from "@/server/documents/document.api";

export function toErrorResponse(error: unknown): NextResponse {
  const mapped = toHttpError(error);
  return NextResponse.json(
    { code: mapped.code, message: mapped.message },
    { status: mapped.statusCode },
  );
}
