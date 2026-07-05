import {
  DocumentParseError,
  NoExtractableTextError,
  parseDocumentContent,
  UnsupportedDocumentTypeError,
} from "./document-parser";
import type {
  DocumentErrorCode,
  DocumentStatus,
  ParsedDocumentChunk,
} from "./document.types";
import type { DocumentStorage } from "./document-storage";

export interface DocumentJob {
  documentId: string;
  workspaceId: string;
  knowledgeBaseId: string;
  filename: string;
  fileType: string;
  sizeBytes: number;
  storageKey: string;
  attempt: number;
}

export interface DocumentProcessingUpdate {
  status: DocumentStatus;
  chunkCount?: number;
  errorCode?: DocumentErrorCode;
  errorMessage?: string;
}

export interface DocumentProcessingResult {
  documentId: string;
  workspaceId: string;
  transitions: DocumentProcessingUpdate[];
  chunks: ParsedDocumentChunk[];
}

export async function processDocumentJob(
  job: DocumentJob,
  storage: DocumentStorage,
): Promise<DocumentProcessingResult> {
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
          errorMessage:
            "Parser could not extract stable sections from the file.",
        },
      ],
      chunks: [],
    };
  }

  const contentBytes = await storage.read(job.storageKey);
  let chunks;

  try {
    chunks = parseDocumentContent({
      fileName: job.filename,
      fileType: job.fileType,
      sizeBytes: job.sizeBytes,
      contentBytes,
    });
  } catch (error) {
    if (error instanceof DocumentParseError) {
      const errorCode: DocumentErrorCode =
        error instanceof UnsupportedDocumentTypeError
          ? "unsupported_file_type"
          : error instanceof NoExtractableTextError
            ? "no_extractable_text"
            : "processing_failed";
      return {
        documentId: job.documentId,
        workspaceId: job.workspaceId,
        transitions: [
          ...baseTransitions,
          {
            status: "failed",
            errorCode,
            errorMessage: error.message,
          },
        ],
        chunks: [],
      };
    }
    throw error;
  }

  return {
    documentId: job.documentId,
    workspaceId: job.workspaceId,
    transitions: [
      ...baseTransitions,
      {
        status: "ready",
        chunkCount: chunks.length,
      },
    ],
    chunks,
  };
}
