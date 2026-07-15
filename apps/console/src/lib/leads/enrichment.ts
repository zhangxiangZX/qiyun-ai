import type { LeadAttachment, LeadDetail, LeadFollowUpRecord } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function formatLeadAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferAttachmentMimeLabel(mimeType: string, fileName: string): string {
  if (mimeType) {
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.startsWith("image/")) return "图片";
    if (mimeType.includes("zip")) return "ZIP";
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "zip") return "ZIP";
  if (ext === "dwg" || ext === "dxf") return "CAD";
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") return "图片";
  return "文件";
}

export function normalizeLeadAttachments(raw: unknown): LeadAttachment[] {
  if (!Array.isArray(raw)) return [];

  const result: LeadAttachment[] = [];

  raw.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const fileName = asString(record.fileName ?? record.name, "");
    if (!fileName) return;
    const statusRaw = asString(record.status, "ready");
    const status: NonNullable<LeadAttachment["status"]> =
      statusRaw === "failed" || statusRaw === "pending" ? statusRaw : "ready";
    result.push({
      id: asString(record.id, `attachment_${index}`),
      fileName,
      mimeType: asString(record.mimeType ?? record.contentType, "application/octet-stream"),
      sizeBytes: asNumber(record.sizeBytes ?? record.size, 0),
      uploadedAt: asString(record.uploadedAt ?? record.createdAt, new Date().toISOString()),
      downloadUrl: asString(record.downloadUrl, "") || undefined,
      status,
      errorMessage: asString(record.errorMessage ?? record.error, "") || undefined,
    });
  });

  return result;
}

export function normalizeLeadFollowUpRecords(raw: unknown): LeadFollowUpRecord[] {
  if (!Array.isArray(raw)) return [];

  const result: LeadFollowUpRecord[] = [];

  raw.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const title = asString(record.title, "");
    if (!title) return;
    const kindRaw = asString(record.kind, "note");
    const kind: LeadFollowUpRecord["kind"] =
      kindRaw === "status" || kindRaw === "assignee" || kindRaw === "system" ? kindRaw : "note";
    const body = asString(record.body ?? record.description, "");
    result.push({
      id: asString(record.id, `follow_${index}`),
      kind,
      title,
      body: body || undefined,
      actor: asString(record.actor ?? record.assignee, "") || null,
      createdAt: asString(record.createdAt, new Date().toISOString()),
    });
  });

  return result;
}

export function enrichLeadDetail(
  detail: LeadDetail,
  options?: { synthesizeTimeline?: boolean },
): LeadDetail {
  const attachments = detail.attachments ?? [];
  let followUpRecords = detail.followUpRecords;
  if (followUpRecords === undefined || followUpRecords === null) {
    followUpRecords = options?.synthesizeTimeline
      ? buildFallbackFollowUpRecords({
          notes: detail.notes,
          status: detail.status,
          assignee: detail.assignee,
          updatedAt: detail.updatedAt,
          createdAt: detail.createdAt,
        })
      : [];
  }

  return {
    ...detail,
    attachments,
    followUpRecords,
  };
}

export function buildFallbackFollowUpRecords(input: {
  notes: string;
  status: LeadDetail["status"];
  assignee: string | null;
  updatedAt: string;
  createdAt: string;
}): LeadFollowUpRecord[] {
  const records: LeadFollowUpRecord[] = [
    {
      id: "follow_created",
      kind: "system",
      title: "线索创建",
      body: "访客提交留资，等待销售跟进。",
      createdAt: input.createdAt,
    },
  ];

  if (input.assignee) {
    records.push({
      id: "follow_assignee",
      kind: "assignee",
      title: `负责人：${input.assignee}`,
      createdAt: input.updatedAt,
      actor: "系统",
    });
  }

  if (input.notes.trim()) {
    records.push({
      id: "follow_notes",
      kind: "note",
      title: "最新跟进备注",
      body: input.notes.trim(),
      createdAt: input.updatedAt,
      actor: input.assignee,
    });
  } else {
    records.push({
      id: "follow_status",
      kind: "status",
      title: `当前状态：${input.status}`,
      createdAt: input.updatedAt,
    });
  }

  return records.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function appendFollowUpRecord(
  detail: LeadDetail,
  input: { title: string; body?: string; kind?: LeadFollowUpRecord["kind"]; actor?: string | null },
): LeadFollowUpRecord[] {
  const next: LeadFollowUpRecord = {
    id: `follow_${Date.now()}`,
    kind: input.kind ?? "note",
    title: input.title,
    body: input.body,
    actor: input.actor ?? detail.assignee,
    createdAt: new Date().toISOString(),
  };
  return [next, ...(detail.followUpRecords ?? [])];
}
