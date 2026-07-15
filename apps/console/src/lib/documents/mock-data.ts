import { detectKind, mimeForKind } from "./format";
import type { DocumentItem, UploadDocumentInput } from "./types";

const SEEDS: DocumentItem[] = [
  {
    id: "doc-seed-001",
    name: "工业视觉检测系统_产品手册.pdf",
    kind: "pdf",
    category: "brochure",
    sizeBytes: 4_812_000,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    uploadedBy: "李娜",
    watermarkable: true,
    watermarked: false,
    status: "ready",
    mimeType: "application/pdf",
  },
  {
    id: "doc-seed-002",
    name: "边缘计算网关_规格参数.pdf",
    kind: "pdf",
    category: "spec",
    sizeBytes: 1_204_000,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    uploadedBy: "赵磊",
    watermarkable: true,
    watermarked: true,
    status: "ready",
    mimeType: "application/pdf",
  },
  {
    id: "doc-seed-003",
    name: "产线实景图_车间A.jpg",
    kind: "image",
    category: "brochure",
    sizeBytes: 2_350_000,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    uploadedBy: "李娜",
    watermarkable: true,
    watermarked: false,
    status: "ready",
    mimeType: "image/jpeg",
  },
  {
    id: "doc-seed-004",
    name: "沈阳重工_报价单_2026Q3.docx",
    kind: "doc",
    category: "quote",
    sizeBytes: 86_400,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    uploadedBy: "赵磊",
    watermarkable: false,
    watermarked: false,
    status: "ready",
    mimeType: "application/msword",
  },
  {
    id: "doc-seed-005",
    name: "设备清单_客户确认表.xlsx",
    kind: "sheet",
    category: "lead",
    sizeBytes: 42_000,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    uploadedBy: "王芳",
    watermarkable: false,
    watermarked: false,
    status: "ready",
    mimeType: "application/vnd.ms-excel",
  },
];

interface PreviewUpload {
  item: DocumentItem;
  blob: Blob;
}

const previewUploads = new Map<string, PreviewUpload>();

let uploadCounter = 0;

export function listDocumentsMock(): DocumentItem[] {
  const uploaded = Array.from(previewUploads.values()).map((entry) => entry.item);
  return [...uploaded, ...SEEDS].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export function createDocumentMock(input: UploadDocumentInput): DocumentItem {
  uploadCounter += 1;
  const id = `doc-up-${Date.now()}-${uploadCounter}`;
  const kind = detectKind(input.file.name);
  const item: DocumentItem = {
    id,
    name: input.file.name,
    kind,
    category: input.category,
    sizeBytes: input.file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    watermarkable: kind === "image" || kind === "pdf",
    watermarked: false,
    status: "ready",
    mimeType: input.file.type || mimeForKind(kind),
  };
  previewUploads.set(id, { item, blob: input.file });
  return item;
}

export function getPreviewDocument(id: string): DocumentItem | undefined {
  const uploaded = previewUploads.get(id)?.item;
  if (uploaded) return uploaded;
  return SEEDS.find((seed) => seed.id === id);
}

export function getPreviewBlob(id: string): Blob | undefined {
  return previewUploads.get(id)?.blob;
}

export function removePreviewDocument(id: string): boolean {
  return previewUploads.delete(id);
}

/**
 * Builds a placeholder blob for seed documents that have no real file attached
 * (preview mode). Image seeds render as an SVG so the client watermark canvas
 * has something to stamp; everything else renders as plain text.
 */
export function buildPlaceholderBlob(item: DocumentItem): Blob {
  if (item.kind === "image") {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#eef2ff"/>
  <rect x="0" y="0" width="800" height="500" fill="url(#g)" opacity="0.5"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b5eff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#0ea5e9" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <text x="400" y="240" font-family="sans-serif" font-size="34" font-weight="700" fill="#1e293b" text-anchor="middle">示例图片</text>
  <text x="400" y="290" font-family="sans-serif" font-size="20" fill="#475569" text-anchor="middle">${escapeXml(item.name)}</text>
</svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }
  const text = `AI云 · 文档中心（演示文件）\n\n文件名称：${item.name}\n类型：${item.kind}\n大小：${item.sizeBytes} 字节\n\n这是预览模式下的占位内容。连接上游 API（apps/api）后将返回真实文件。`;
  return new Blob([text], { type: "text/plain;charset=utf-8" });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
