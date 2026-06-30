export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "indexing"
  | "ready"
  | "failed";

export interface KnowledgeBase {
  id: string;
  workspaceId?: string;
  name: string;
  status: "active" | "disabled";
  documentCount: number;
  readyDocumentCount: number;
  failedDocumentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  workspaceId?: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: string;
  storageKey?: string;
  sizeBytes: number;
  status: DocumentStatus;
  chunkCount: number | null;
  errorMessage: string | null;
  createdAt?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UploadDocumentInput {
  fileName: string;
  fileType: string;
  sizeBytes: number;
}

export interface DeleteKnowledgeBaseResult {
  id: string;
  deletedAt: string;
  documentCount: number;
}

export const IN_PROGRESS_STATUSES: DocumentStatus[] = ["uploaded", "parsing", "indexing"];

export function isInProgressStatus(status: DocumentStatus): boolean {
  return IN_PROGRESS_STATUSES.includes(status);
}
