import { getApiPrefix } from "@/lib/api/client";
import { ApiError, normalizeApiErrorCode, type ApiErrorCode } from "@/lib/api/errors";
import { WORKSPACE_ID } from "@/lib/api/workspace";

export type ReportExportApiType = "inquiries" | "channels" | "sales";
export type ReportExportUiType = "sales" | "inquiry" | "channel";

export function mapUiTypeToApiType(type: ReportExportUiType): ReportExportApiType {
  if (type === "sales") return "sales";
  if (type === "channel") return "channels";
  return "inquiries";
}

export type ReportExportStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportExportTask {
  id: string;
  reportType: ReportExportApiType;
  format?: string | null;
  filters?: unknown | null;
  status: ReportExportStatus;
  fileName: string | null;
  sizeBytes: number | null;
  errorMessage?: string | null;
  createdBy?: string | null;
  createdAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
}

interface RawReportExportRow {
  id: string;
  report_type: string;
  format?: string | null;
  filters?: unknown | null;
  status: string;
  file_name: string | null;
  size_bytes: number | null;
  error_message?: string | null;
  created_by?: string | null;
  created_at: string;
  completed_at?: string | null;
  expires_at?: string | null;
}

function normalizeReportExport(row: RawReportExportRow): ReportExportTask {
  return {
    id: row.id,
    reportType: row.report_type as ReportExportApiType,
    format: row.format ?? null,
    filters: row.filters ?? null,
    status: row.status as ReportExportStatus,
    fileName: row.file_name,
    sizeBytes:
      typeof row.size_bytes === "string" ? Number(row.size_bytes) : (row.size_bytes ?? null),
    errorMessage: row.error_message ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
    expiresAt: row.expires_at ?? null,
  };
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function createReportExport(type: ReportExportApiType): Promise<ReportExportTask> {
  const response = await fetch(`${getApiPrefix()}/reports/exports`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": WORKSPACE_ID,
    },
    body: JSON.stringify({ type }),
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let code: ApiErrorCode = "INTERNAL_ERROR";
    let message = `导出任务创建失败（${response.status}）`;
    try {
      const payload = (await response.json()) as { code?: string; message?: string };
      code = normalizeApiErrorCode(response.status, payload.code);
      if (payload.message) message = payload.message;
    } catch {
      // Keep default message when the body is not JSON.
    }
    throw new ApiError(response.status, code, message);
  }

  const data = (await response.json()) as {
    id: string;
    type?: ReportExportApiType;
    status?: ReportExportStatus;
    fileName?: string | null;
    sizeBytes?: number | null;
  };
  return {
    id: data.id,
    reportType: data.type ?? type,
    status: data.status ?? "completed",
    fileName: data.fileName ?? null,
    sizeBytes: data.sizeBytes ?? null,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

export async function listReportExports(): Promise<ReportExportTask[]> {
  const response = await fetch(`${getApiPrefix()}/reports/exports`, {
    headers: { "x-workspace-id": WORKSPACE_ID },
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 503) return [];
  if (!response.ok) {
    throw new ApiError(
      response.status,
      normalizeApiErrorCode(response.status),
      "导出历史加载失败。",
    );
  }
  const rows = (await response.json()) as RawReportExportRow[];
  return Array.isArray(rows) ? rows.map(normalizeReportExport) : [];
}

export async function downloadReportExport(id: string, fallbackName = "report.csv"): Promise<void> {
  const response = await fetch(`${getApiPrefix()}/reports/exports/${encodeURIComponent(id)}/download`, {
    headers: { "x-workspace-id": WORKSPACE_ID },
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      normalizeApiErrorCode(response.status),
      "文件下载失败。",
    );
  }
  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"), fallbackName);
  triggerDownload(blob, filename);
}

export const REPORT_TYPE_LABELS: Record<ReportExportApiType, string> = {
  inquiries: "询盘报表",
  channels: "渠道分析报表",
  sales: "销售业绩报表",
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildPreviewExportTask(type: ReportExportApiType): ReportExportTask {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  return {
    id: `re_preview_${Math.random().toString(36).slice(2, 8)}`,
    reportType: type,
    status: "completed",
    fileName: `qiyun-${type}-${stamp}.csv`,
    sizeBytes: 2048 + Math.floor(Math.random() * 8192),
    createdAt: now.toISOString(),
    completedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
  };
}

export function buildMockReportExports(): ReportExportTask[] {
  const base = Date.now();
  const samples: Array<Partial<ReportExportTask> & { type: ReportExportApiType; ageDays: number }> = [
    { type: "inquiries", ageDays: 0 },
    { type: "sales", ageDays: 1 },
    { type: "channels", ageDays: 2 },
    { type: "inquiries", ageDays: 4 },
  ];
  return samples.map((sample, i) => {
    const created = new Date(base - sample.ageDays * 86400000);
    const stamp = created.toISOString().slice(0, 10);
    return {
      id: `re_mock_${i}`,
      reportType: sample.type,
      status: "completed" as ReportExportStatus,
      fileName: `qiyun-${sample.type}-${stamp}.csv`,
      sizeBytes: 2048 + i * 1024,
      createdAt: created.toISOString(),
      completedAt: created.toISOString(),
      expiresAt: new Date(created.getTime() + 7 * 86400000).toISOString(),
    };
  });
}
