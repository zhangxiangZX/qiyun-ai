import {
  DocumentAccessError,
  DocumentService,
  DocumentValidationError,
} from "./document.service";
import type { UploadDocumentInput } from "./document.types";
import type { RequestContext } from "@/server/workspace";

export { DocumentAccessError, DocumentValidationError };

export class DocumentApi {
  constructor(private readonly service: DocumentService) {}

  createKnowledgeBase(context: RequestContext, body: { name: string }) {
    return this.service.createKnowledgeBase({
      workspaceId: context.workspaceId,
      name: body.name,
    });
  }

  listKnowledgeBases(context: RequestContext) {
    return this.service.listKnowledgeBases(context.workspaceId);
  }

  getKnowledgeBase(context: RequestContext, knowledgeBaseId: string) {
    return this.service.getKnowledgeBase(context.workspaceId, knowledgeBaseId);
  }

  updateKnowledgeBase(
    context: RequestContext,
    knowledgeBaseId: string,
    body: { name?: string; status?: "active" | "disabled" },
  ) {
    return this.service.updateKnowledgeBase(context.workspaceId, knowledgeBaseId, body);
  }

  deleteKnowledgeBase(context: RequestContext, knowledgeBaseId: string) {
    return this.service.deleteKnowledgeBase(context.workspaceId, knowledgeBaseId);
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

  listKnowledgeBaseDocuments(context: RequestContext, knowledgeBaseId: string) {
    return this.service.listKnowledgeBaseDocuments(context.workspaceId, knowledgeBaseId);
  }

  getDocument(context: RequestContext, documentId: string) {
    return this.service.getDocument(context.workspaceId, documentId);
  }

  reindexDocument(context: RequestContext, documentId: string) {
    return this.service.reindexDocument(context.workspaceId, documentId);
  }
}

export function toHttpError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  if (error instanceof DocumentAccessError) {
    return { statusCode: 404, code: "NOT_FOUND", message: error.message };
  }

  if (error instanceof DocumentValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected error." };
}
