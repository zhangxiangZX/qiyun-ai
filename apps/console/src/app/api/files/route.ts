import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { tryProxy } from "@/server/proxy";
import {
  createDocumentMock,
  listDocumentsMock,
} from "@/lib/documents/mock-data";
import type { DocumentCategory } from "@/lib/documents/types";

export async function GET(request: NextRequest) {
  const proxied = await tryProxy(request, "/files");
  if (proxied) return proxied;

  return NextResponse.json({ documents: listDocumentsMock() });
}

export async function POST(request: NextRequest) {
  const proxied = await tryProxy(request, "/files");
  if (proxied) return proxied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "请求体应为 multipart/form-data。" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const category = (form.get("category") as DocumentCategory) ?? "other";
  if (!(file instanceof File)) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "缺少上传文件。" },
      { status: 400 },
    );
  }

  const item = createDocumentMock({ file, category, uploadedBy: "演示用户" });
  return NextResponse.json(item);
}
