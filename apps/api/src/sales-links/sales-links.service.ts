import { randomUUID } from "node:crypto";
import { SalesLinksAccessError, type SalesLinksRepository } from "./sales-links.repository";
import type { SalesLinkChannel, SalesLinkRecord, SalesLinkStatus, ScanLogSource } from "./sales-links.types";
import { CHANNEL_LABELS } from "./sales-links.types";

export { SalesLinksAccessError };

export class SalesLinksValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesLinksValidationError";
  }
}

export class SalesLinksService {
  constructor(private readonly repository: SalesLinksRepository) {}

  private toListItem(record: SalesLinkRecord) {
    const conversionRate =
      record.visits > 0
        ? Math.round((record.conversions / record.visits) * 100)
        : 0;
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      channel: record.channel,
      channelLabel: CHANNEL_LABELS[record.channel],
      shortUrl: record.shortUrl ?? `/public/sales-links/${record.slug}`,
      targetUrl: record.targetUrl,
      visits: record.visits,
      inquiries: record.inquiries,
      conversions: record.conversions,
      conversionRate,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async list(workspaceId: string) {
    const records = await this.repository.list(workspaceId);
    return records.map((r) => this.toListItem(r));
  }

  async getById(workspaceId: string, id: string) {
    const record = await this.repository.findById(workspaceId, id);
    if (!record) throw new SalesLinksAccessError("Sales link not found.");
    return this.toListItem(record);
  }

  async getBySlug(slug: string) {
    const record = await this.repository.findBySlug(slug);
    if (!record) return null;
    return this.toListItem(record);
  }

  async create(
    workspaceId: string,
    input: {
      name: string;
      channel?: SalesLinkChannel;
      targetUrl?: string;
      slug?: string;
    },
  ) {
    const now = new Date().toISOString();
    const slug = input.slug ?? `link-${randomUUID().slice(0, 8)}`;
    const existing = await this.repository.findBySlug(slug);
    if (existing) throw new SalesLinksValidationError("Slug already taken.");

    const record: SalesLinkRecord = {
      id: `sl_${randomUUID()}`,
      workspaceId,
      name: input.name.trim(),
      slug,
      channel: input.channel ?? "other",
      targetUrl: input.targetUrl?.trim() ?? null,
      shortUrl: null,
      status: "active",
      visits: 0,
      inquiries: 0,
      conversions: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await this.repository.create(record);
    return this.toListItem(record);
  }

  async update(
    workspaceId: string,
    id: string,
    patch: {
      name?: string;
      channel?: SalesLinkChannel;
      targetUrl?: string | null;
      status?: SalesLinkStatus;
      slug?: string;
    },
  ) {
    await this.require(workspaceId, id);
    if (patch.slug) {
      const conflict = await this.repository.findBySlug(patch.slug);
      if (conflict && conflict.id !== id)
        throw new SalesLinksValidationError("Slug already taken.");
    }
    const updated = await this.repository.update(workspaceId, id, patch);
    if (!updated) throw new SalesLinksAccessError("Sales link not found.");
    return this.toListItem(updated);
  }

  async delete(workspaceId: string, id: string) {
    await this.require(workspaceId, id);
    return this.repository.delete(workspaceId, id);
  }

  async trackVisit(slug: string) {
    return this.recordScan(slug, { source: "link" });
  }

  async recordScan(
    slug: string,
    meta: { source?: ScanLogSource; referer?: string | null; userAgent?: string | null } = {},
  ) {
    const record = await this.repository.findBySlug(slug);
    if (!record || record.deletedAt) return;
    await this.repository.incrementVisits(record.workspaceId, record.id);
    await this.repository.recordScanLog({
      workspaceId: record.workspaceId,
      salesLinkId: record.id,
      source: meta.source ?? "link",
      referer: meta.referer ?? null,
      userAgent: meta.userAgent ?? null,
    });
  }

  async trackInquiry(slug: string) {
    const record = await this.repository.findBySlug(slug);
    if (record) await this.repository.incrementInquiries(record.workspaceId, record.id);
  }

  async listScanLogs(workspaceId: string, id: string, limit = 50) {
    await this.require(workspaceId, id);
    return this.repository.listScanLogs(workspaceId, id, limit);
  }

  private async require(workspaceId: string, id: string) {
    const record = await this.repository.findById(workspaceId, id);
    if (!record) throw new SalesLinksAccessError("Sales link not found.");
    return record;
  }
}
