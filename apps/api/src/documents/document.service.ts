import { randomUUID } from "node:crypto";

import type {
  DocumentIndexJob,
  DocumentRecord,
  DocumentStatus,
  KnowledgeBaseRecord,
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
  }): KnowledgeBaseRecord {
    const now = new Date().toISOString();
    return this.repository.createKnowledgeBase({
      id: `kb_${randomUUID()}`,
      workspaceId: input.workspaceId,
      name: input.name,
      status: "active",
      createdAt: now,
    });
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
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });

      this.queue.enqueue(this.toJob(document));
      return document;
    });
  }

  getDocument(workspaceId: string, documentId: string): DocumentRecord {
    const document = this.repository.findDocumentById(documentId);
    if (!document || document.workspaceId !== workspaceId) {
      throw new DocumentAccessError("Document not found in workspace.");
    }
    return document;
  }

  listKnowledgeBaseDocuments(workspaceId: string, knowledgeBaseId: string): DocumentRecord[] {
    this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    return this.repository.listDocumentsByKnowledgeBase(knowledgeBaseId);
  }

  reindexDocument(workspaceId: string, documentId: string): DocumentRecord {
    this.getDocument(workspaceId, documentId);
    const updated = this.repository.updateDocument(documentId, {
      status: "uploaded",
      chunkCount: null,
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
  }): DocumentRecord {
    const current = this.getDocument(input.workspaceId, input.documentId);
    const updated = this.repository.updateDocument(current.id, {
      status: input.status,
      chunkCount: input.chunkCount ?? current.chunkCount,
      errorMessage: input.errorMessage ?? null,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new DocumentAccessError("Document not found in workspace.");
    }

    return updated;
  }

  private requireKnowledgeBase(workspaceId: string, knowledgeBaseId: string): KnowledgeBaseRecord {
    const knowledgeBase = this.repository.findKnowledgeBaseById(knowledgeBaseId);
    if (!knowledgeBase || knowledgeBase.workspaceId !== workspaceId) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }
    return knowledgeBase;
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
