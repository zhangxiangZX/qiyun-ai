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

export interface KnowledgeBaseRecord {
  id: string;
  workspaceId: string;
  name: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface KnowledgeBaseSummary {
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

export interface DocumentRecord {
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

export interface DeleteDocumentResult {
  id: string;
  knowledgeBaseId: string;
  deletedAt: string;
  removedChunkCount: number;
  storageAction: "deleted" | "archived";
  archivedStorageKey: string | null;
}

export interface UploadDocumentInput {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  contentBytes?: Uint8Array | null;
}

export interface DocumentIndexJob {
  jobId: string;
  workspaceId: string;
  knowledgeBaseId: string;
  documentId: string;
  storageKey: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  queuedAt: string;
  attempts: number;
}

export interface DocumentDeadLetterJob extends DocumentIndexJob {
  failedAt: string;
  errorMessage: string;
}

export interface ParsedDocumentChunk {
  content: string;
}

export interface QueueLike {
  enqueue(job: DocumentIndexJob): Promise<void>;
  list(): Promise<DocumentIndexJob[]>;
  clear(): Promise<void>;
}
