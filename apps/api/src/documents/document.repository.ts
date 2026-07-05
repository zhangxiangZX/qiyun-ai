import type {
  DocumentRecord,
  KnowledgeBaseRecord,
  KnowledgeBaseSummary,
} from "./document.types";

export interface DocumentRepository {
  createKnowledgeBase(record: KnowledgeBaseRecord): Promise<KnowledgeBaseRecord>;
  findKnowledgeBaseById(id: string): Promise<KnowledgeBaseRecord | null>;
  findKnowledgeBaseByName(
    workspaceId: string,
    name: string,
  ): Promise<KnowledgeBaseRecord | null>;
  listKnowledgeBases(workspaceId: string): Promise<KnowledgeBaseRecord[]>;
  updateKnowledgeBase(
    id: string,
    patch: Partial<KnowledgeBaseRecord>,
  ): Promise<KnowledgeBaseRecord | null>;
  createDocument(record: DocumentRecord): Promise<DocumentRecord>;
  updateDocument(
    id: string,
    patch: Partial<DocumentRecord>,
  ): Promise<DocumentRecord | null>;
  findDocumentById(id: string): Promise<DocumentRecord | null>;
  listDocumentsByKnowledgeBase(knowledgeBaseId: string): Promise<DocumentRecord[]>;
  softDeleteDocumentsByKnowledgeBase(
    knowledgeBaseId: string,
    deletedAt: string,
  ): Promise<number>;
  summarizeKnowledgeBase(
    knowledgeBaseId: string,
  ): Promise<Pick<
    KnowledgeBaseSummary,
    "documentCount" | "readyDocumentCount" | "failedDocumentCount"
  >>;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly knowledgeBases = new Map<string, KnowledgeBaseRecord>();
  private readonly documents = new Map<string, DocumentRecord>();

  loadSnapshot(input: {
    knowledgeBases: KnowledgeBaseRecord[];
    documents: DocumentRecord[];
  }): void {
    this.knowledgeBases.clear();
    this.documents.clear();

    for (const record of input.knowledgeBases) {
      this.knowledgeBases.set(record.id, record);
    }

    for (const record of input.documents) {
      this.documents.set(record.id, record);
    }
  }

  dumpSnapshot(): {
    knowledgeBases: KnowledgeBaseRecord[];
    documents: DocumentRecord[];
  } {
    return {
      knowledgeBases: [...this.knowledgeBases.values()],
      documents: [...this.documents.values()],
    };
  }

  async createKnowledgeBase(record: KnowledgeBaseRecord): Promise<KnowledgeBaseRecord> {
    this.knowledgeBases.set(record.id, record);
    return record;
  }

  async findKnowledgeBaseById(id: string): Promise<KnowledgeBaseRecord | null> {
    return this.knowledgeBases.get(id) ?? null;
  }

  async findKnowledgeBaseByName(
    workspaceId: string,
    name: string,
  ): Promise<KnowledgeBaseRecord | null> {
    return (
      [...this.knowledgeBases.values()].find(
        (item) =>
          item.workspaceId === workspaceId &&
          item.deletedAt === null &&
          item.name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }

  async listKnowledgeBases(workspaceId: string): Promise<KnowledgeBaseRecord[]> {
    return [...this.knowledgeBases.values()].filter(
      (item) => item.workspaceId === workspaceId && item.deletedAt === null,
    );
  }

  async updateKnowledgeBase(
    id: string,
    patch: Partial<KnowledgeBaseRecord>,
  ): Promise<KnowledgeBaseRecord | null> {
    const current = this.knowledgeBases.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...patch };
    this.knowledgeBases.set(id, next);
    return next;
  }

  async createDocument(record: DocumentRecord): Promise<DocumentRecord> {
    this.documents.set(record.id, record);
    return record;
  }

  async updateDocument(
    id: string,
    patch: Partial<DocumentRecord>,
  ): Promise<DocumentRecord | null> {
    const current = this.documents.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...patch };
    this.documents.set(id, next);
    return next;
  }

  async findDocumentById(id: string): Promise<DocumentRecord | null> {
    return this.documents.get(id) ?? null;
  }

  async listDocumentsByKnowledgeBase(knowledgeBaseId: string): Promise<DocumentRecord[]> {
    return [...this.documents.values()].filter(
      (item) => item.knowledgeBaseId === knowledgeBaseId && item.deletedAt === null,
    );
  }

  async softDeleteDocumentsByKnowledgeBase(
    knowledgeBaseId: string,
    deletedAt: string,
  ): Promise<number> {
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

  async summarizeKnowledgeBase(
    knowledgeBaseId: string,
  ): Promise<Pick<
    KnowledgeBaseSummary,
    "documentCount" | "readyDocumentCount" | "failedDocumentCount"
  >> {
    const documents = await this.listDocumentsByKnowledgeBase(knowledgeBaseId);

    return {
      documentCount: documents.length,
      readyDocumentCount: documents.filter((item) => item.status === "ready").length,
      failedDocumentCount: documents.filter((item) => item.status === "failed").length,
    };
  }
}
