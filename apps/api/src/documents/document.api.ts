import type { RequestContext } from "../workspace";
import { writeWorkspaceAudit } from "../audit/audit-write";
import type { AuditApi } from "../audit/audit.api";
import { RagAccessError, RagService, RagValidationError } from "../rag/rag.service";
import { SelectionPagesAccessError } from "../selection-pages/selection-pages.repository";
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
    private readonly auditApi?: AuditApi,
  ) {}

  async createKnowledgeBase(context: RequestContext, body: { name: string }) {
    const result = await this.service.createKnowledgeBase({
      workspaceId: context.workspaceId,
      name: body.name,
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "knowledge",
      action: "create",
      targetId: result.id,
      detail: { name: result.name },
    });
    return result;
  }

  listKnowledgeBases(context: RequestContext) {
    return this.service.listKnowledgeBases(context.workspaceId);
  }

  getKnowledgeBase(context: RequestContext, knowledgeBaseId: string) {
    return this.service.getKnowledgeBase(context.workspaceId, knowledgeBaseId);
  }

  async updateKnowledgeBase(
    context: RequestContext,
    knowledgeBaseId: string,
    body: { name?: string; status?: "active" | "disabled" },
  ) {
    const result = await this.service.updateKnowledgeBase(
      context.workspaceId,
      knowledgeBaseId,
      body,
    );
    writeWorkspaceAudit(this.auditApi, context, {
      module: "knowledge",
      action: "update",
      targetId: knowledgeBaseId,
      detail: body,
    });
    return result;
  }

  async deleteKnowledgeBase(context: RequestContext, knowledgeBaseId: string) {
    const result = await this.service.deleteKnowledgeBase(context.workspaceId, knowledgeBaseId);
    writeWorkspaceAudit(this.auditApi, context, {
      module: "knowledge",
      action: "delete",
      targetId: knowledgeBaseId,
    });
    return result;
  }

  async uploadDocuments(
    context: RequestContext,
    knowledgeBaseId: string,
    files: UploadDocumentInput[],
  ) {
    const result = await this.service.uploadDocuments({
      workspaceId: context.workspaceId,
      knowledgeBaseId,
      files,
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "document",
      action: "upload",
      targetId: knowledgeBaseId,
      detail: {
        fileName: files.map((file) => file.fileName).join("、"),
        count: files.length,
      },
    });
    return result;
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

  async reparseDocument(context: RequestContext, documentId: string) {
    const result = await this.service.reparseDocument(context.workspaceId, documentId);
    writeWorkspaceAudit(this.auditApi, context, {
      module: "document",
      action: "update",
      targetId: documentId,
      detail: { action: "reparse" },
    });
    return result;
  }

  updateDocumentTags(
    context: RequestContext,
    documentId: string,
    tags: string[],
  ) {
    return this.service.updateDocumentTags(context.workspaceId, documentId, tags);
  }

  moveDocument(
    context: RequestContext,
    documentId: string,
    targetKnowledgeBaseId: string,
  ) {
    return this.service.moveDocument(context.workspaceId, documentId, targetKnowledgeBaseId);
  }

  async deleteDocument(context: RequestContext, documentId: string) {
    const { removedChunkCount } = await this.ragService.deleteDocumentChunks(
      context.workspaceId,
      documentId,
    );
    const result = await this.service.deleteDocument(
      context.workspaceId,
      documentId,
      removedChunkCount,
    );
    writeWorkspaceAudit(this.auditApi, context, {
      module: "document",
      action: "delete",
      targetId: documentId,
    });
    return result;
  }

  listDocumentChunks(context: RequestContext, documentId: string) {
    return this.ragService.listDocumentChunks(context.workspaceId, documentId);
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

  if (error instanceof SelectionPagesAccessError) {
    const isSlugConflict = /slug/i.test(error.message);
    return {
      statusCode: isSlugConflict ? 400 : 404,
      code: isSlugConflict ? "VALIDATION_ERROR" : "NOT_FOUND",
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Unexpected error.",
  };
}
