import { randomUUID } from "node:crypto";

import type {
  DeleteDocumentResult,
  DocumentErrorCode,
  DocumentIndexJob,
  DocumentRecord,
  DocumentStatus,
  KnowledgeBaseRecord,
  KnowledgeBaseSummary,
  QueueLike,
  UploadDocumentInput,
} from "./document.types";
import type { DocumentRepository } from "./document.repository";
import type { DocumentStorage } from "./document-storage";

export class DocumentAccessError extends Error {}
export class DocumentValidationError extends Error {}

const reindexAttempts = new Map<string, number>();
const DOCUMENT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/octet-stream",
]);

function hasAllowedDocumentExtension(fileName: string): boolean {
  const normalized = fileName.trim().toLowerCase();
  return [...ALLOWED_DOCUMENT_EXTENSIONS].some((extension) => normalized.endsWith(extension));
}

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly queue: QueueLike,
    private readonly storage: DocumentStorage,
  ) {}

  async createKnowledgeBase(input: {
    workspaceId: string;
    name: string;
  }): Promise<KnowledgeBaseSummary> {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new DocumentValidationError("Knowledge base name is required.");
    }

    if (await this.repository.findKnowledgeBaseByName(input.workspaceId, normalizedName)) {
      throw new DocumentValidationError(
        "Knowledge base name already exists in workspace.",
      );
    }

    const now = new Date().toISOString();
    const record = await this.repository.createKnowledgeBase({
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

  async listKnowledgeBases(workspaceId: string): Promise<KnowledgeBaseSummary[]> {
    const knowledgeBases = await this.repository.listKnowledgeBases(workspaceId);
    const summaries = await Promise.all(
      knowledgeBases.map((item) => this.toKnowledgeBaseSummary(item)),
    );
    return summaries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getKnowledgeBase(
    workspaceId: string,
    knowledgeBaseId: string,
  ): Promise<KnowledgeBaseSummary> {
    return this.toKnowledgeBaseSummary(
      await this.requireKnowledgeBase(workspaceId, knowledgeBaseId),
    );
  }

  async updateKnowledgeBase(
    workspaceId: string,
    knowledgeBaseId: string,
    patch: {
      name?: string;
      status?: "active" | "disabled";
    },
  ): Promise<KnowledgeBaseSummary> {
    const current = await this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    const nextName = patch.name?.trim();

    if (patch.name !== undefined && !nextName) {
      throw new DocumentValidationError("Knowledge base name is required.");
    }

    if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
      const existing = await this.repository.findKnowledgeBaseByName(workspaceId, nextName);
      if (existing && existing.id !== knowledgeBaseId) {
        throw new DocumentValidationError(
          "Knowledge base name already exists in workspace.",
        );
      }
    }

    const updated = await this.repository.updateKnowledgeBase(knowledgeBaseId, {
      name: nextName ?? current.name,
      status: patch.status ?? current.status,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }

    return this.toKnowledgeBaseSummary(updated);
  }

  async deleteKnowledgeBase(
    workspaceId: string,
    knowledgeBaseId: string,
  ): Promise<{ id: string; deletedAt: string; documentCount: number }> {
    await this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    const deletedAt = new Date().toISOString();
    const updated = await this.repository.updateKnowledgeBase(knowledgeBaseId, {
      deletedAt,
      updatedAt: deletedAt,
    });

    if (!updated) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }

    const documentCount = await this.repository.softDeleteDocumentsByKnowledgeBase(
      knowledgeBaseId,
      deletedAt,
    );

    return { id: knowledgeBaseId, deletedAt, documentCount };
  }

  async uploadDocuments(input: {
    workspaceId: string;
    knowledgeBaseId: string;
    files: UploadDocumentInput[];
  }): Promise<DocumentRecord[]> {
    const knowledgeBase = await this.requireKnowledgeBase(
      input.workspaceId,
      input.knowledgeBaseId,
    );
    if (knowledgeBase.status !== "active") {
      throw new DocumentValidationError("Knowledge base is not active.");
    }

    const documents: DocumentRecord[] = [];

    for (const file of input.files) {
      this.validateUpload(file);
      const now = new Date().toISOString();
      const contentBytes = file.contentBytes ?? new TextEncoder().encode(file.fileName);
      const stored = await this.storage.save({
        workspaceId: input.workspaceId,
        knowledgeBaseId: input.knowledgeBaseId,
        fileName: file.fileName,
        contentBytes,
      });
      const document = await this.repository.createDocument({
        id: `doc_${randomUUID()}`,
        workspaceId: input.workspaceId,
        knowledgeBaseId: input.knowledgeBaseId,
        fileName: file.fileName,
        fileType: file.fileType,
        storageKey: stored.storageKey,
        sizeBytes: stored.sizeBytes,
        status: "uploaded",
        chunkCount: null,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      await this.queue.enqueue(this.toJob(document));
      documents.push(document);
    }

    return documents;
  }

  async getDocument(workspaceId: string, documentId: string): Promise<DocumentRecord> {
    const document = await this.repository.findDocumentById(documentId);
    if (!document || document.workspaceId !== workspaceId || document.deletedAt !== null) {
      throw new DocumentAccessError("Document not found in workspace.");
    }
    return document;
  }

  async listKnowledgeBaseDocuments(
    workspaceId: string,
    knowledgeBaseId: string,
  ): Promise<DocumentRecord[]> {
    await this.requireKnowledgeBase(workspaceId, knowledgeBaseId);
    const documents = await this.repository.listDocumentsByKnowledgeBase(knowledgeBaseId);
    return documents.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async reindexDocument(workspaceId: string, documentId: string): Promise<DocumentRecord> {
    await this.getDocument(workspaceId, documentId);
    const updated = await this.repository.updateDocument(documentId, {
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
    await this.queue.enqueue(this.toJob(updated, attempts));
    return updated;
  }

  async deleteDocument(
    workspaceId: string,
    documentId: string,
    removedChunkCount = 0,
  ): Promise<DeleteDocumentResult> {
    const document = await this.getDocument(workspaceId, documentId);
    const storageRemoval = await this.storage.remove(document.storageKey);
    const deletedAt = new Date().toISOString();
    const updated = await this.repository.updateDocument(document.id, {
      deletedAt,
      updatedAt: deletedAt,
    });

    if (!updated) {
      throw new DocumentAccessError("Document not found in workspace.");
    }

    return {
      id: updated.id,
      knowledgeBaseId: updated.knowledgeBaseId,
      deletedAt,
      removedChunkCount,
      storageAction: storageRemoval.action,
      archivedStorageKey: storageRemoval.archivedStorageKey,
    };
  }

  async applyWorkerStatus(input: {
    workspaceId: string;
    documentId: string;
    status: DocumentStatus;
    chunkCount?: number | null;
    errorCode?: DocumentErrorCode | null;
    errorMessage?: string | null;
  }): Promise<DocumentRecord> {
    const current = await this.getDocument(input.workspaceId, input.documentId);
    const updated = await this.repository.updateDocument(current.id, {
      status: input.status,
      chunkCount: input.chunkCount ?? current.chunkCount,
      errorCode:
        input.status === "ready"
          ? null
          : input.errorCode === undefined
            ? current.errorCode
            : input.errorCode,
      errorMessage: input.errorMessage ?? null,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new DocumentAccessError("Document not found in workspace.");
    }

    return updated;
  }

  private async requireKnowledgeBase(
    workspaceId: string,
    knowledgeBaseId: string,
  ): Promise<KnowledgeBaseRecord> {
    const knowledgeBase = await this.repository.findKnowledgeBaseById(knowledgeBaseId);
    if (
      !knowledgeBase ||
      knowledgeBase.workspaceId !== workspaceId ||
      knowledgeBase.deletedAt !== null
    ) {
      throw new DocumentAccessError("Knowledge base not found in workspace.");
    }
    return knowledgeBase;
  }

  private async toKnowledgeBaseSummary(
    record: KnowledgeBaseRecord,
  ): Promise<KnowledgeBaseSummary> {
    const stats = await this.repository.summarizeKnowledgeBase(record.id);

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
    if (file.sizeBytes > DOCUMENT_UPLOAD_MAX_BYTES) {
      throw new DocumentValidationError("File size must be 25 MB or less.");
    }
    if (!hasAllowedDocumentExtension(file.fileName)) {
      throw new DocumentValidationError(
        "Only PDF, DOCX, TXT, and MD files are supported in MVP.",
      );
    }
    const fileType = file.fileType.trim().toLowerCase();
    if (fileType && !ALLOWED_DOCUMENT_TYPES.has(fileType)) {
      throw new DocumentValidationError(
        `Unsupported file type "${file.fileType}" for ${file.fileName}.`,
      );
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
