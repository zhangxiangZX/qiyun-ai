import type {
  DocumentCategory,
  DocumentCategoryMeta,
  DocumentKind,
} from "./types";

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"];
const PDF_EXT = ["pdf"];
const DOC_EXT = ["doc", "docx", "txt", "md", "rtf"];
const SHEET_EXT = ["xls", "xlsx", "csv"];

export function detectKind(name: string): DocumentKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXT.includes(ext)) return "image";
  if (PDF_EXT.includes(ext)) return "pdf";
  if (DOC_EXT.includes(ext)) return "doc";
  if (SHEET_EXT.includes(ext)) return "sheet";
  return "other";
}

export function mimeForKind(kind: DocumentKind): string {
  switch (kind) {
    case "image":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "sheet":
      return "application/vnd.ms-excel";
    default:
      return "application/octet-stream";
  }
}

export const CATEGORY_META: Record<DocumentCategory, DocumentCategoryMeta> = {
  brochure: { label: "产品手册", color: "#3b5eff" },
  spec: { label: "规格参数", color: "#0ea5e9" },
  quote: { label: "报价单", color: "#f97316" },
  contract: { label: "合同", color: "#8b5cf6" },
  lead: { label: "客户资料", color: "#22c55e" },
  other: { label: "其他", color: "#64748b" },
};

export const KIND_LABEL: Record<DocumentKind, string> = {
  pdf: "PDF",
  image: "图片",
  doc: "文档",
  sheet: "表格",
  other: "文件",
};

export function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
