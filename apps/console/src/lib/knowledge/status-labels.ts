import type { DocumentStatus } from "./types";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "已上传",
  parsing: "解析中",
  indexing: "索引中",
  ready: "就绪",
  failed: "失败",
};

export function getStatusBadgeVariant(
  status: DocumentStatus,
): "default" | "info" | "warning" | "success" | "destructive" {
  switch (status) {
    case "uploaded":
      return "default";
    case "parsing":
    case "indexing":
      return "info";
    case "ready":
      return "success";
    case "failed":
      return "destructive";
  }
}

export const KNOWLEDGE_BASE_STATUS_LABELS = {
  active: "已启用",
  disabled: "已停用",
} as const;

export function getKnowledgeBaseStatusBadgeVariant(
  status: keyof typeof KNOWLEDGE_BASE_STATUS_LABELS,
): "success" | "warning" {
  return status === "active" ? "success" : "warning";
}
