import type { DocumentRecord, KnowledgeBaseRecord } from "./document.types";

export interface DocumentRepository {
  createKnowledgeBase(record: KnowledgeBaseRecord): KnowledgeBaseRecord;
  findKnowledgeBaseById(id: string): KnowledgeBaseRecord | null;
  listKnowledgeBases(workspaceId: string): KnowledgeBaseRecord[];
  createDocument(record: DocumentRecord): DocumentRecord;
  updateDocument(id: string, patch: Partial<DocumentRecord>): DocumentRecord | null;
  findDocumentById(id: string): DocumentRecord | null;
  listDocumentsByKnowledgeBase(knowledgeBaseId: string): DocumentRecord[];
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

  listKnowledgeBases(workspaceId: string): KnowledgeBaseRecord[] {
    return [...this.knowledgeBases.values()].filter((item) => item.workspaceId === workspaceId);
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
    return [...this.documents.values()].filter((item) => item.knowledgeBaseId === knowledgeBaseId);
  }
}
