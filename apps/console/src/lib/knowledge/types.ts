export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "indexing"
  | "ready"
  | "failed";

export interface KnowledgeBase {
  id: string;
  name: string;
  status: "active" | "disabled";
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  status: DocumentStatus;
  chunkCount: number | null;
  errorMessage: string | null;
  updatedAt: string;
}
