import { randomUUID } from "node:crypto";
import { SelectionPagesAccessError, type SelectionPagesRepository } from "./selection-pages.repository";
import type { SelectionPageConfig } from "./selection-pages.types";
import type { SalesService } from "../sales/sales.service";
import type { CalendarApi } from "../calendar/calendar.api";
import type { FileVaultRepository } from "../file-vault/file-vault.repository";
import type { SourceType } from "../sales/sales.types";

export { SelectionPagesAccessError };

export function resolveSelectionAcquisitionSource(
  source: string | undefined,
  slug: string,
): { sourceType: SourceType; sourceCode: string } {
  const normalized = source?.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "").slice(0, 64);
  if (!normalized) return { sourceType: "website", sourceCode: `selection:${slug}` };
  if (normalized === "wechat" || normalized === "wechat_official_account") {
    return { sourceType: "wechat", sourceCode: normalized };
  }
  if (normalized === "sales_link" || normalized.startsWith("sales_link:")) {
    return { sourceType: "sales_link", sourceCode: normalized };
  }
  if (normalized === "douyin") return { sourceType: "douyin", sourceCode: normalized };
  if (normalized === "expo") return { sourceType: "expo", sourceCode: normalized };
  return { sourceType: "website", sourceCode: normalized };
}

export class SelectionPagesService {
  constructor(
    private readonly repo: SelectionPagesRepository,
    private readonly sales?: SalesService,
    private readonly calendar?: CalendarApi,
    private readonly files?: FileVaultRepository,
  ) {}

  async list(workspaceId: string) {
    return this.repo.list(workspaceId);
  }

  async getById(workspaceId: string, id: string) {
    const page = await this.repo.findById(workspaceId, id);
    if (!page) throw new SelectionPagesAccessError("Selection page not found.");
    return page;
  }

  async getBySlug(slug: string) {
    const page = await this.repo.findBySlug(slug);
    if (!page || page.status !== "published") return null;
    return page;
  }

  async create(workspaceId: string, input: { name: string; slug?: string; description?: string; config?: SelectionPageConfig }) {
    const now = new Date().toISOString();
    const slug = input.slug ?? `sp-${randomUUID().slice(0, 8)}`;
    const existing = await this.repo.findBySlug(slug);
    if (existing) throw new SelectionPagesAccessError("Slug already taken.");

    return this.repo.upsert({
      id: `sp_${randomUUID()}`,
      workspaceId,
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      config: input.config ?? {},
      status: "draft",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  async update(workspaceId: string, id: string, patch: Partial<{ name: string; slug: string; description: string | null; config: SelectionPageConfig; status: "draft" | "published" | "disabled" }>) {
    const existing = await this.getById(workspaceId, id);
    if (patch.slug) {
      const conflict = await this.repo.findBySlug(patch.slug);
      if (conflict && conflict.id !== id) throw new SelectionPagesAccessError("Slug taken.");
    }
    return this.repo.upsert({
      ...existing,
      ...patch,
      config: patch.config ? { ...existing.config, ...patch.config } : existing.config,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(workspaceId: string, id: string) {
    await this.getById(workspaceId, id);
    return this.repo.delete(workspaceId, id);
  }

  async submit(slug: string, submission: { answers: Record<string, string>; contactName?: string; contactPhone?: string; contactEmail?: string; attachmentIds?: string[]; source?: string; consentAccepted?: boolean; consentAcceptedAt?: string; consentVersion?: string }) {
    const page = await this.repo.findBySlug(slug);
    if (!page || page.status !== "published") throw new SelectionPagesAccessError("Not found or not published.");
    if (
      submission.consentAccepted !== true ||
      !submission.consentVersion?.trim() ||
      !submission.consentAcceptedAt ||
      !Number.isFinite(Date.parse(submission.consentAcceptedAt))
    ) {
      throw new SelectionPagesAccessError("Privacy consent is required.");
    }
    const attachmentIds = [...new Set(submission.attachmentIds ?? [])];
    if (this.files && attachmentIds.some((id) => !this.files!.getMeta(page.workspaceId, id))) {
      throw new SelectionPagesAccessError("Selection attachment not found in workspace.");
    }
    const summary = Object.entries(submission.answers).map(([key, value]) => `${key}: ${value}`).join("\n");
    const acquisition = resolveSelectionAcquisitionSource(submission.source ?? submission.answers.source, page.slug);
    const inquiry = this.sales ? await this.sales.createInquiry(page.workspaceId, {
      customerName: submission.contactName?.trim() || "AI选型客户",
      customerContact: submission.contactName?.trim() || null,
      phone: submission.contactPhone?.trim() || null,
      email: submission.contactEmail?.trim() || null,
      sourceType: acquisition.sourceType,
      sourceCode: acquisition.sourceCode,
      summary,
      productNeed: summary,
      knownFields: {
        selectionPageId: page.id,
        selectionPageName: page.name,
        acquisitionSource: acquisition.sourceCode,
        attachmentIds: attachmentIds.join(","),
      },
    }) : null;
    const start = new Date(Date.now() + 30 * 60 * 1000);
    const followTask = this.calendar && inquiry ? await this.calendar.createEvent(page.workspaceId, {
      title: `首次跟进：${inquiry.customerName ?? "AI选型客户"}`,
      start: start.toISOString(),
      end: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
      kind: "follow_up",
      status: "pending",
      leadId: inquiry.id,
      leadName: inquiry.customerName ?? undefined,
      note: "AI选型提交后自动创建的首次跟进任务",
    }) : null;
    return this.repo.createSubmission({
      id: `ss_${randomUUID()}`,
      selectionPageId: page.id,
      answers: {
        ...submission.answers,
        source: acquisition.sourceCode,
        consentAcceptedAt: new Date(submission.consentAcceptedAt).toISOString(),
        consentVersion: submission.consentVersion.trim(),
      },
      contactName: submission.contactName ?? null,
      contactPhone: submission.contactPhone ?? null,
      contactEmail: submission.contactEmail ?? null,
      attachmentIds,
      status: inquiry ? "converted" : "submitted",
      inquiryId: inquiry?.id ?? null,
      followTaskId: followTask?.id ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  async listSubmissions(workspaceId: string, pageId: string) {
    await this.getById(workspaceId, pageId);
    return this.repo.listSubmissions(pageId);
  }
}
