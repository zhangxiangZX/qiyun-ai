import type { DocumentStatus } from "./types";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  parsing: "Parsing",
  indexing: "Indexing",
  ready: "Ready",
  failed: "Failed",
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
