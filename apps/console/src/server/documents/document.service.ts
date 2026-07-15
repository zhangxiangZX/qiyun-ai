import { randomUUID } from "node:crypto";

import type {
  DocumentIndexJob,
  DocumentRecord,
  DocumentStatus,
  DocumentErrorCode,
  KnowledgeBaseRecord,
  KnowledgeBaseSummary,
  QueueLike,
  UploadDocumentInput,
} from "./document.types";
import type { DocumentRepository } from "./document.repository";

export class DocumentAccessError extends Error {}
export class DocumentValidationError extends Error {}

const reindexAttempts = new Map<string, number>();

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly queue: QueueLike,
  ) {}

  createKnowledgeBase(input: {
    workspaceId: string;
    name: string;
  }): KnowledgeBaseSummary {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new DocumentValidationError("Knowledge base name is required.");
    }
    if (this.repository.findKnowledgeBaseByName(input.workspaceId, normalizedName)) {
      throw new DocumentValidationError("Knowledge base name already exists in workspace.");
    }

    const now = new Date().toISOString();
    const record = this.repository.createKnowledgeBase({
      id: `kb_${randomUUID()}`,
      workspaceId: input.workspaceId,
      name: normalizedName,
      status: "active",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    return this.toKnowledgeBaseSummary(record);
  }

  listKnowledgeBases(workspaceId: string): KnowledgeBaseSummary[] {
    return this.repository
      .listKnowledgeBases(workspaceId)
      .map((item) => this.toKnowledgeBaseSummary(item))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getKnowledgeBase(workspaceId: string, knowledgeBaseId: string): KnowledgeBaseSummary {
    return this.toKnowledgeBaseSummary(this.requireKnowledgeBase(workspaceId, knowledgeBaseId));
  }

  updateKnowledgeBase(
    workspaceId: string,
    knowledgeBaseId: string,
    patch: {
      name?: string;
      status?: "active" | "disabled";
    },
  ): KnowledgeBaseSummary {
    const current = this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    const nextName = patch.name?.trim();

    if (patch.name !== undefined && !nextName) {
      throw new DocumentValidationError("Knowledge base name is required.");
    }

    if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
      const existing = this.repository.findKnowledgeBaseByName(workspaceId, nextName);
      if (existing && existing.id !== knowledgeBaseId) {
        throw new DocumentValidationError("Knowledge base name already exists in workspace.");
      }
    }

    const updated = this.repository.updateKnowledgeBase(knowledgeBaseId, {
      name: nextName ?? current.name,
      status: patch.status ?? current.status,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }

    return this.toKnowledgeBaseSummary(updated);
  }

  deleteKnowledgeBase(
    workspaceId: string,
    knowledgeBaseId: string,
  ): { id: string; deletedAt: string; documentCount: number } {
    this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    const deletedAt = new Date().toISOString();
    const updated = this.repository.updateKnowledgeBase(knowledgeBaseId, {
      deletedAt,
      updatedAt: deletedAt,
    });

    if (!updated) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }

    const documentCount = this.repository.softDeleteDocumentsByKnowledgeBase(
      knowledgeBaseId,
      deletedAt,
    );

    return { id: knowledgeBaseId, deletedAt, documentCount };
  }

  uploadDocuments(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    files: UploadDocumentInput[];
  }): DocumentRecord[] {
    const knowledgeBase = this.requireKnowledgeBase(input.workspaceId, input.knowledgeBaseId);
    if (knowledgeBase.status !== "active") {
      throw new DocumentValidationError("Knowledge base is not active.");
    }

    return input.files.map((file) => {
      this.validateUpload(file);
      const now = new Date().toISOString();
      const document = this.repository.createDocument({
        id: `doc_${randomUUID()}`,
        workspaceId: input.workspaceId,
        knowledgeBaseId: input.knowledgeBaseId,
        fileName: file.fileName,
        fileType: file.fileType,
        storageKey: `${input.workspaceId}/${input.knowledgeBaseId}/${randomUUID()}-${file.fileName}`,
        sizeBytes: file.sizeBytes,
        status: "uploaded",
        chunkCount: null,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      this.queue.enqueue(this.toJob(document));
      return document;
    });
  }

  getDocument(workspaceId: string, documentId: string): DocumentRecord {
    const document = this.repository.findDocumentById(documentId);
    if (!document || document.workspaceId !== workspaceId || document.deletedAt !== null) {
      throw new DocumentAccessError("Document not found in workspace.");
    }
    return document;
  }

  listKnowledgeBaseDocuments(workspaceId: string, knowledgeBaseId: string): DocumentRecord[] {
    this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    return this.repository
      .listDocumentsByKnowledgeBase(knowledgeBaseId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  reindexDocument(workspaceId: string, documentId: string): DocumentRecord {
    this.getDocument(workspaceId, documentId);
    const updated = this.repository.updateDocument(documentId, {
      status: "uploaded",
      chunkCount: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new DocumentAccessError("Document not found in workspace.");
    }

    const attempts = (reindexAttempts.get(documentId) ?? 0) + 1;
    reindexAttempts.set(documentId, attempts);
    this.queue.enqueue(this.toJob(updated, attempts));
    return updated;
  }

  applyWorkerStatus(input: {
    workspaceId: string;
    documentId: string;
    status: DocumentStatus;
    chunkCount?: number | null;
    errorMessage?: string | null;
    errorCode?: DocumentErrorCode | null;
  }): DocumentRecord {
    const current = this.getDocument(input.workspaceId, input.documentId);
    const updated = this.repository.updateDocument(current.id, {
      status: input.status,
      chunkCount: input.chunkCount ?? current.chunkCount,
      errorMessage: input.errorMessage ?? null,
      errorCode: input.errorCode ?? null,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new DocumentAccessError("Document not found in workspace.");
    }

    return updated;
  }

  private requireKnowledgeBase(workspaceId: string, knowledgeBaseId: string): KnowledgeBaseRecord {
    const knowledgeBase = this.repository.findKnowledgeBaseById(knowledgeBaseId);
    if (!knowledgeBase || knowledgeBase.workspaceId !== workspaceId || knowledgeBase.deletedAt !== null) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }
    return knowledgeBase;
  }

  private toKnowledgeBaseSummary(record: KnowledgeBaseRecord): KnowledgeBaseSummary {
    const stats = this.repository.summarizeKnowledgeBase(record.id);

    return {
      id: record.id,
      workspaceId: record.workspaceId,
      name: record.name,
      status: record.status,
      documentCount: stats.documentCount,
      readyDocumentCount: stats.readyDocumentCount,
      failedDocumentCount: stats.failedDocumentCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private validateUpload(file: UploadDocumentInput): void {
    if (!file.fileName.trim()) {
      throw new DocumentValidationError("File name is required.");
    }
    if (file.sizeBytes <= 0) {
      throw new DocumentValidationError("File size must be greater than zero.");
    }
  }

  private toJob(document: DocumentRecord, attempts = 0): DocumentIndexJob {
    return {
      jobId: `job_${randomUUID()}`,
      workspaceId: document.workspaceId,
      knowledgeBaseId: document.knowledgeBaseId,
      documentId: document.id,
      storageKey: document.storageKey,
      fileName: document.fileName,
      fileType: document.fileType,
      sizeBytes: document.sizeBytes,
      queuedAt: new Date().toISOString(),
      attempts,
    };
  }
}
