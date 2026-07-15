export type UploadFileStatus = "completed" | "parsing" | "uploading" | "queued" | "failed";

export interface UploadFileRow {
  id: string;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "xlsx" | "txt" | "md" | "html";
  size: string;
  uploadProgress: number;
  status: UploadFileStatus;
  statusLabel: string;
  extractedSummary: string;
  eta?: string;
}

export const uploadMockFiles: UploadFileRow[] = [
  {
    id: "f1",
    fileName: "智能客服产品手册.pdf",
    fileType: "pdf",
    size: "2.4 MB",
    uploadProgress: 100,
    status: "completed",
    statusLabel: "解析完成",
    extractedSummary: "文本 842 · 表格 12 · 图片 36",
  },
  {
    id: "f2",
    fileName: "2024解决方案白皮书.docx",
    fileType: "docx",
    size: "1.8 MB",
    uploadProgress: 100,
    status: "completed",
    statusLabel: "解析完成",
    extractedSummary: "文本 624 · 表格 8",
  },
  {
    id: "f3",
    fileName: "产品功能演示文档.pptx",
    fileType: "pptx",
    size: "5.2 MB",
    uploadProgress: 85,
    status: "parsing",
    statusLabel: "解析中",
    extractedSummary: "预计剩余 03:15",
    eta: "03:15",
  },
  {
    id: "f4",
    fileName: "技术文档_集成指南.md",
    fileType: "md",
    size: "128 KB",
    uploadProgress: 20,
    status: "uploading",
    statusLabel: "上传中",
    extractedSummary: "26 KB / 128 KB",
  },
  {
    id: "f5",
    fileName: "报价模板说明.xlsx",
    fileType: "xlsx",
    size: "456 KB",
    uploadProgress: 0,
    status: "queued",
    statusLabel: "待解析",
    extractedSummary: "—",
  },
  {
    id: "f6",
    fileName: "售后服务FAQ.txt",
    fileType: "txt",
    size: "64 KB",
    uploadProgress: 100,
    status: "completed",
    statusLabel: "解析完成",
    extractedSummary: "文本 186",
  },
];

export const uploadParseSummary = {
  completionRate: 78,
  total: 6,
  parsed: 4,
  parsing: 1,
  queued: 1,
  textBlocks: 1245,
  tables: 66,
  images: 237,
  codeBlocks: 64,
};

export const uploadQualityScores = {
  coverage: { score: 4, label: "良好" },
  structure: { score: 4.5, label: "优秀" },
  readability: { score: 4, label: "良好" },
  duplicateRate: 12,
  duplicateLabel: "较低",
  suggestion: "建议为 PDF 文档补充封面与标签，提升检索命中率。",
};
