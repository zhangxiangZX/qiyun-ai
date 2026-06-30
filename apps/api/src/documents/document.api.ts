import {
  DocumentAccessError,
  DocumentService,
  DocumentValidationError,
} from "./document.service";
import type { UploadDocumentInput } from "./document.types";

export interface RequestContext {
  workspaceId: string;
}

export class DocumentApi {
  constructor(private readonly service: DocumentService) {}

  createKnowledgeBase(context: RequestContext, body: { name: string }) {
    return this.service.createKnowledgeBase({
      workspaceId: context.workspaceId,
      name: body.name,
    });
  }

  uploadDocuments(
    context: RequestContext,
    knowledgeBaseId: string,
    files: UploadDocumentInput[],
  ) {
    return this.service.uploadDocuments({
      workspaceId: context.workspaceId,
      knowledgeBaseId,
      files,
    });
  }

  getDocument(context: RequestContext, documentId: string) {
    return this.service.getDocument(context.workspaceId, documentId);
  }

  reindexDocument(context: RequestContext, documentId: string) {
    return this.service.reindexDocument(context.workspaceId, documentId);
  }
}

export function toHttpError(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof DocumentAccessError) {
    return { statusCode: 404, code: "NOT_FOUND", message: error.message };
  }

  if (error instanceof DocumentValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected error." };
}
