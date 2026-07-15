export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "indexing"
  | "ready"
  | "failed";

export type DocumentErrorCode =
  | "parser_unstable_sections"
  | "unsupported_file_type"
  | "no_extractable_text"
  | "processing_failed";

export interface KnowledgeBase {
  id: string;
  workspaceId: string;
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
  workspaceId: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: string;
  storageKey: string;
  sizeBytes: number;
  status: DocumentStatus;
  chunkCount: number | null;
  errorCode: DocumentErrorCode | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DeleteKnowledgeBaseResult {
  id: string;
  deletedAt: string;
  documentCount: number;
}

export interface DeleteKnowledgeDocumentResult {
  id: string;
  knowledgeBaseId: string;
  deletedAt: string;
  removedChunkCount: number;
  storageAction: "deleted" | "archived";
  archivedStorageKey: string | null;
}

export interface KnowledgeDocumentChunk {
  id: string;
  chunkIndex: number | null;
  sectionTitle: string | null;
  content: string;
  tokenEstimate: number;
}

export const IN_PROGRESS_STATUSES: DocumentStatus[] = [
  "uploaded",
  "parsing",
  "indexing",
];

export function isInProgressStatus(status: DocumentStatus): boolean {
  return IN_PROGRESS_STATUSES.includes(status);
}
