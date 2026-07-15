import type { SalesLinkRecord, ScanLogInput, ScanLogRecord } from "./sales-links.types";

export interface SalesLinksRepository {
  list(workspaceId: string): Promise<SalesLinkRecord[]>;
  findById(workspaceId: string, id: string): Promise<SalesLinkRecord | null>;
  findBySlug(slug: string): Promise<SalesLinkRecord | null>;
  create(record: SalesLinkRecord): Promise<SalesLinkRecord>;
  update(
    workspaceId: string,
    id: string,
    patch: Partial<SalesLinkRecord>,
  ): Promise<SalesLinkRecord | null>;
  delete(workspaceId: string, id: string): Promise<{ id: string }>;
  incrementVisits(workspaceId: string, id: string): Promise<void>;
  incrementInquiries(workspaceId: string, id: string): Promise<void>;
  recordScanLog(input: ScanLogInput): Promise<void>;
  listScanLogs(workspaceId: string, salesLinkId: string, limit: number): Promise<ScanLogRecord[]>;
}

export class SalesLinksAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesLinksAccessError";
  }
}

export class InMemorySalesLinksRepository implements SalesLinksRepository {
  private readonly links = new Map<string, SalesLinkRecord>();

  async list(workspaceId: string): Promise<SalesLinkRecord[]> {
    return [...this.links.values()]
      .filter((r) => r.workspaceId === workspaceId && !r.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findById(workspaceId: string, id: string): Promise<SalesLinkRecord | null> {
    const record = this.links.get(id);
    return record && record.workspaceId === workspaceId && !record.deletedAt ? record : null;
  }

  async findBySlug(slug: string): Promise<SalesLinkRecord | null> {
    for (const r of this.links.values()) {
      if (r.slug === slug && !r.deletedAt) return r;
    }
    return null;
  }

  async create(record: SalesLinkRecord): Promise<SalesLinkRecord> {
    this.links.set(record.id, record);
    return record;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Partial<SalesLinkRecord>,
  ): Promise<SalesLinkRecord | null> {
    const record = await this.findById(workspaceId, id);
    if (!record) return null;
    Object.assign(record, patch, { updatedAt: new Date().toISOString() });
    this.links.set(id, record);
    return record;
  }

  async delete(workspaceId: string, id: string): Promise<{ id: string }> {
    const record = await this.findById(workspaceId, id);
    if (!record) throw new SalesLinksAccessError("Sales link not found.");
    record.deletedAt = new Date().toISOString();
    record.updatedAt = record.deletedAt;
    return { id };
  }

  async incrementVisits(workspaceId: string, id: string): Promise<void> {
    const record = await this.findById(workspaceId, id);
    if (record) record.visits += 1;
  }

  async incrementInquiries(workspaceId: string, id: string): Promise<void> {
    const record = await this.findById(workspaceId, id);
    if (record) {
      record.inquiries += 1;
      record.conversions += 1;
    }
  }

  private readonly scans = new Map<string, ScanLogRecord>();

  async recordScanLog(input: ScanLogInput): Promise<void> {
    const id = `scan_${Math.random().toString(36).slice(2, 10)}`;
    this.scans.set(id, {
      id,
      workspaceId: input.workspaceId,
      salesLinkId: input.salesLinkId,
      source: input.source,
      visitor: input.visitor ?? null,
      referer: input.referer ?? null,
      userAgent: input.userAgent ?? null,
      scannedAt: new Date().toISOString(),
    });
  }

  async listScanLogs(workspaceId: string, salesLinkId: string, limit: number): Promise<ScanLogRecord[]> {
    return [...this.scans.values()]
      .filter((s) => s.workspaceId === workspaceId && s.salesLinkId === salesLinkId)
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, limit);
  }
}
