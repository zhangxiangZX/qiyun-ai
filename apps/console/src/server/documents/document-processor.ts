import type { DocumentErrorCode, DocumentStatus } from "./document.types";

export type DocumentJob = {
  documentId: string;
  workspaceId: string;
  knowledgeBaseId: string;
  filename: string;
  sizeBytes: number;
  storageKey: string;
  attempt: number;
};

export type DocumentProcessingUpdate = {
  status: DocumentStatus;
  chunkCount?: number;
  errorCode?: DocumentErrorCode;
  errorMessage?: string;
};

export type DocumentProcessingResult = {
  documentId: string;
  workspaceId: string;
  transitions: DocumentProcessingUpdate[];
};

function estimateChunkCount(sizeBytes: number): number {
  return Math.max(1, Math.round(sizeBytes / 2048));
}

export function processDocumentJob(job: DocumentJob): DocumentProcessingResult {
  const baseTransitions: DocumentProcessingUpdate[] = [
    { status: "uploaded" },
    { status: "parsing" },
    { status: "indexing" },
  ];

  if (job.filename.toLowerCase().includes("fail")) {
    return {
      documentId: job.documentId,
      workspaceId: job.workspaceId,
      transitions: [
        ...baseTransitions,
        {
          status: "failed",
          errorCode: "parser_unstable_sections",
          errorMessage: "Parser could not extract stable sections from the file.",
        },
      ],
    };
  }

  return {
    documentId: job.documentId,
    workspaceId: job.workspaceId,
    transitions: [
      ...baseTransitions,
      {
        status: "ready",
        chunkCount: estimateChunkCount(job.sizeBytes),
      },
    ],
  };
}
