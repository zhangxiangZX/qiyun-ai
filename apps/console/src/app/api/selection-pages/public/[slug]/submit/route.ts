import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

type SubmitBody = {
  name?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  answers?: Record<string, string>;
  attachmentIds?: string[];
  source?: string;
  product?: string;
  message?: string;
  company?: string;
  need?: string;
  files?: string[];
};

function normalizeSubmitBody(raw: SubmitBody): {
  answers: Record<string, string>;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  attachmentIds?: string[];
  source?: string;
} {
  const answers: Record<string, string> = { ...(raw.answers ?? {}) };
  if (raw.product && !answers.product) answers.product = raw.product;
  if (raw.source && !answers.source) answers.source = raw.source;
  if (raw.message && !answers.message) answers.message = raw.message;
  if (raw.company && !answers.company) answers.company = raw.company;
  if (raw.need && !answers.need) answers.need = raw.need;
  if (Array.isArray(raw.files) && raw.files.length > 0 && !answers.files) {
    answers.files = raw.files.join(", ");
  }

  const contactName = (raw.contactName ?? raw.name)?.trim() || undefined;
  const contactPhone = (raw.contactPhone ?? raw.phone)?.trim() || undefined;
  const contactEmail = (raw.contactEmail ?? raw.email)?.trim() || undefined;
  const source = (raw.source ?? answers.source)?.trim() || undefined;
  if (source && !answers.source) answers.source = source;

  return {
    answers,
    contactName,
    contactPhone,
    contactEmail,
    attachmentIds: raw.attachmentIds,
    source,
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { code: "NOT_AVAILABLE", message: "需配置 API_BASE_URL" },
      { status: 503 },
    );
  }

  let raw: SubmitBody = {};
  try {
    raw = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ message: "请求体无效" }, { status: 400 });
  }

  const normalized = normalizeSubmitBody(raw);
  if (!normalized.contactName || !normalized.contactPhone) {
    return NextResponse.json({ message: "请填写联系人和手机号" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${baseUrl}/public/selection-pages/${encodeURIComponent(slug)}/submit`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Forward top-level `source` for future API support; answers.source is always set today.
        body: JSON.stringify({
          answers: normalized.answers,
          contactName: normalized.contactName,
          contactPhone: normalized.contactPhone,
          contactEmail: normalized.contactEmail,
          attachmentIds: normalized.attachmentIds,
          source: normalized.source,
        }),
        cache: "no-store",
      },
    );
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "上游提交失败",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}