import type { SelectionPageRecord, SelectionSubmissionRecord } from "./selection-pages.types";

export class SelectionPagesAccessError extends Error {
  constructor(m: string) { super(m); this.name = "SelectionPagesAccessError"; }
}

export interface SelectionPagesRepository {
  list(workspaceId: string): Promise<SelectionPageRecord[]>;
  findById(workspaceId: string, id: string): Promise<SelectionPageRecord | null>;
  findBySlug(slug: string): Promise<SelectionPageRecord | null>;
  upsert(record: SelectionPageRecord): Promise<SelectionPageRecord>;
  delete(workspaceId: string, id: string): Promise<{ id: string }>;
  createSubmission(record: SelectionSubmissionRecord): Promise<SelectionSubmissionRecord>;
  findSubmissionById(pageId: string, id: string): Promise<SelectionSubmissionRecord | null>;
  listSubmissions(pageId: string): Promise<SelectionSubmissionRecord[]>;
}

export class InMemorySelectionPagesRepository implements SelectionPagesRepository {
  private pages = new Map<string, SelectionPageRecord>();
  private submissions = new Map<string, SelectionSubmissionRecord>();

  async list(workspaceId: string) {
    return [...this.pages.values()].filter((p) => p.workspaceId === workspaceId && !p.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  async findById(workspaceId: string, id: string) {
    const p = this.pages.get(id);
    return p && p.workspaceId === workspaceId && !p.deletedAt ? p : null;
  }
  async findBySlug(slug: string) {
    for (const p of this.pages.values()) { if (p.slug === slug && !p.deletedAt) return p; }
    return null;
  }
  async upsert(record: SelectionPageRecord) { this.pages.set(record.id, record); return record; }
  async delete(workspaceId: string, id: string) {
    const p = await this.findById(workspaceId, id);
    if (!p) throw new SelectionPagesAccessError("Not found.");
    p.deletedAt = new Date().toISOString(); p.updatedAt = p.deletedAt;
    return { id };
  }
  async createSubmission(record: SelectionSubmissionRecord) { this.submissions.set(record.id, record); return record; }
  async findSubmissionById(pageId: string, id: string) {
    const item = this.submissions.get(id);
    return item?.selectionPageId === pageId ? item : null;
  }
  async listSubmissions(pageId: string) {
    return [...this.submissions.values()].filter((s) => s.selectionPageId === pageId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
