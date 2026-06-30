import type {
  DocumentRecord,
  KnowledgeBaseRecord,
  KnowledgeBaseSummary,
} from "./document.types";

export interface DocumentRepository {
  createKnowledgeBase(record: KnowledgeBaseRecord): KnowledgeBaseRecord;
  findKnowledgeBaseById(id: string): KnowledgeBaseRecord | null;
  findKnowledgeBaseByName(workspaceId: string, name: string): KnowledgeBaseRecord | null;
  listKnowledgeBases(workspaceId: string): KnowledgeBaseRecord[];
  updateKnowledgeBase(id: string, patch: Partial<KnowledgeBaseRecord>): KnowledgeBaseRecord | null;
  createDocument(record: DocumentRecord): DocumentRecord;
  updateDocument(id: string, patch: Partial<DocumentRecord>): DocumentRecord | null;
  findDocumentById(id: string): DocumentRecord | null;
  listDocumentsByKnowledgeBase(knowledgeBaseId: string): DocumentRecord[];
  softDeleteDocumentsByKnowledgeBase(knowledgeBaseId: string, deletedAt: string): number;
  summarizeKnowledgeBase(knowledgeBaseId: string): Pick<
    KnowledgeBaseSummary,
    "documentCount" | "readyDocumentCount" | "failedDocumentCount"
  >;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly knowledgeBases = new Map<string, KnowledgeBaseRecord>();
  private readonly documents = new Map<string, DocumentRecord>();

  createKnowledgeBase(record: KnowledgeBaseRecord): KnowledgeBaseRecord {
    this.knowledgeBases.set(record.id, record);
    return record;
  }

  findKnowledgeBaseById(id: string): KnowledgeBaseRecord | null {
    return this.knowledgeBases.get(id) ?? null;
  }

  findKnowledgeBaseByName(workspaceId: string, name: string): KnowledgeBaseRecord | null {
    return (
      [...this.knowledgeBases.values()].find(
        (item) =>
          item.workspaceId === workspaceId &&
          item.deletedAt === null &&
          item.name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }

  listKnowledgeBases(workspaceId: string): KnowledgeBaseRecord[] {
    return [...this.knowledgeBases.values()].filter(
      (item) => item.workspaceId === workspaceId && item.deletedAt === null,
    );
  }

  updateKnowledgeBase(id: string, patch: Partial<KnowledgeBaseRecord>): KnowledgeBaseRecord | null {
    const current = this.knowledgeBases.get(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    this.knowledgeBases.set(id, next);
    return next;
  }

  createDocument(record: DocumentRecord): DocumentRecord {
    this.documents.set(record.id, record);
    return record;
  }

  updateDocument(id: string, patch: Partial<DocumentRecord>): DocumentRecord | null {
    const current = this.documents.get(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    this.documents.set(id, next);
    return next;
  }

  findDocumentById(id: string): DocumentRecord | null {
    return this.documents.get(id) ?? null;
  }

  listDocumentsByKnowledgeBase(knowledgeBaseId: string): DocumentRecord[] {
    return [...this.documents.values()].filter(
      (item) => item.knowledgeBaseId === knowledgeBaseId && item.deletedAt === null,
    );
  }

  softDeleteDocumentsByKnowledgeBase(knowledgeBaseId: string, deletedAt: string): number {
    let affected = 0;

    for (const [id, document] of this.documents.entries()) {
      if (document.knowledgeBaseId !== knowledgeBaseId || document.deletedAt !== null) {
        continue;
      }

      this.documents.set(id, {
        ...document,
        deletedAt,
        updatedAt: deletedAt,
      });
      affected += 1;
    }

    return affected;
  }

  summarizeKnowledgeBase(
    knowledgeBaseId: string,
  ): Pick<KnowledgeBaseSummary, "documentCount" | "readyDocumentCount" | "failedDocumentCount"> {
    const documents = this.listDocumentsByKnowledgeBase(knowledgeBaseId);

    return {
      documentCount: documents.length,
      readyDocumentCount: documents.filter((item) => item.status === "ready").length,
      failedDocumentCount: documents.filter((item) => item.status === "failed").length,
    };
  }
}
