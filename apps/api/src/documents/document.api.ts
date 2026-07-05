import type { RequestContext } from "../workspace";
import { RagAccessError, RagService, RagValidationError } from "../rag/rag.service";
import {
  DocumentDeadLetterNotFoundError,
  DocumentDeadLetterUnavailableError,
  getDeadLetterDocumentJob,
  getDeadLetterQueueSnapshot,
  removeDeadLetterDocumentJob,
  requeueDeadLetterDocumentJob,
} from "./document-dead-letter-queue";
import {
  DocumentAccessError,
  DocumentService,
  DocumentValidationError,
} from "./document.service";
import type { UploadDocumentInput } from "./document.types";

export {
  DocumentAccessError,
  DocumentDeadLetterNotFoundError,
  DocumentDeadLetterUnavailableError,
  DocumentValidationError,
};

export class DocumentApi {
  constructor(
    private readonly service: DocumentService,
    private readonly ragService: RagService,
  ) {}

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
    return this.service.updateKnowledgeBase(
      context.workspaceId,
      knowledgeBaseId,
      body,
    );
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

  listKnowledgeBaseDocuments(
    context: RequestContext,
    knowledgeBaseId: string,
  ) {
    return this.service.listKnowledgeBaseDocuments(
      context.workspaceId,
      knowledgeBaseId,
    );
  }

  getDocument(context: RequestContext, documentId: string) {
    return this.service.getDocument(context.workspaceId, documentId);
  }

  reindexDocument(context: RequestContext, documentId: string) {
    return this.service.reindexDocument(context.workspaceId, documentId);
  }

  async deleteDocument(context: RequestContext, documentId: string) {
    const { removedChunkCount } = await this.ragService.deleteDocumentChunks(
      context.workspaceId,
      documentId,
    );
    return this.service.deleteDocument(context.workspaceId, documentId, removedChunkCount);
  }

  listDeadLetterJobs(context: RequestContext) {
    return getDeadLetterQueueSnapshot(context.workspaceId);
  }

  async getDeadLetterJob(context: RequestContext, jobId: string) {
    const job = await getDeadLetterDocumentJob(jobId, context.workspaceId);
    if (!job) {
      throw new DocumentDeadLetterNotFoundError("Dead-letter job not found in workspace.");
    }
    return job;
  }

  async retryDeadLetterJob(context: RequestContext, jobId: string) {
    const result = await requeueDeadLetterDocumentJob(jobId, context.workspaceId);
    await this.service.getDocument(context.workspaceId, result.deadLetter.documentId);
    return result;
  }

  dismissDeadLetterJob(context: RequestContext, jobId: string) {
    return removeDeadLetterDocumentJob(jobId, context.workspaceId);
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

  if (error instanceof RagAccessError) {
    return { statusCode: 404, code: "NOT_FOUND", message: error.message };
  }

  if (error instanceof RagValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  if (error instanceof DocumentDeadLetterUnavailableError) {
    return {
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
      message: error.message,
    };
  }

  if (error instanceof DocumentDeadLetterNotFoundError) {
    return { statusCode: 404, code: "NOT_FOUND", message: error.message };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Unexpected error.",
  };
}
