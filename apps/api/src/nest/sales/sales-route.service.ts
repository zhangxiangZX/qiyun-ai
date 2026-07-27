import { Inject, Injectable } from "@nestjs/common";

import { parseAnalyticsQuery } from "../../analytics/analytics-query";
import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { readJsonBody, readUploadBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import { toSalesHttpError } from "../../sales/sales.api";
import type { InquiryListTab, LostReason, SourceType } from "../../sales/sales.types";
import type { DocumentCategory } from "../../file-vault/file-vault.types";
import { renderQuotePdf } from "../../sales/quote-pdf";
import { createHash, randomUUID } from "node:crypto";
import { query as pgQuery } from "../../db/pg";
import { sendQuoteEmail } from "../../sales/quote-mailer";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

function assertManagerRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new AuthAccessError("Workspace manager access is required.");
  }
}

function assertWriteRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin" && role !== "member") {
    throw new AuthAccessError("Workspace member access is required.");
  }
}

async function attachWorkspaceLogo(
  runtime: ApiRuntime,
  userId: string,
  workspaceId: string,
  document: { sample: { company: { logoUrl?: string } } },
) {
  try {
    const workspace = await runtime.authApi.getWorkspaceById(userId, workspaceId);
    const logoUrl = workspace.companyProfile && typeof workspace.companyProfile === "object"
      ? (workspace.companyProfile as Record<string, unknown>).logoUrl
      : undefined;
    if (typeof logoUrl === "string" && logoUrl.trim()) {
      document.sample.company.logoUrl = logoUrl.trim();
    }
  } catch {
    // logo is optional for PDF
  }
}

@Injectable()
export class SalesRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;
    const url = new URL(request.url);

    try {
      // ── Analytics ──
      if (pathname === "/analytics/sales-overview" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const query = parseAnalyticsQuery(url.searchParams);
        return ok(await this.runtime.salesApi.getSalesOverview(context, query));
      }
      if (pathname === "/analytics/conversion-funnel" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const query = parseAnalyticsQuery(url.searchParams);
        return ok(await this.runtime.salesApi.getConversionFunnel(context, query));
      }
      if (pathname === "/analytics/channel-attribution" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const query = parseAnalyticsQuery(url.searchParams);
        return ok(await this.runtime.salesApi.getChannelAttribution(context, query));
      }
      if (pathname === "/analytics/sources" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const query = parseAnalyticsQuery(url.searchParams);
        return ok(await this.runtime.salesApi.getSourceAnalytics(context, query));
      }

      // ── Inquiries CRUD ──
      if (pathname === "/inquiries" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const intent = url.searchParams.get("intent")?.trim() as "low" | "medium" | "high" | undefined;
        const status = (url.searchParams.get("status")?.trim() || "all") as "open" | "closed" | "all";
        const limitRaw = url.searchParams.get("limit");
        const limit = limitRaw ? Number(limitRaw) : undefined;
        const unassigned = url.searchParams.get("unassigned") === "true";
        const q = url.searchParams.get("q")?.trim() || undefined;
        const tabRaw = url.searchParams.get("tab")?.trim();
        const tabs: InquiryListTab[] = ["all", "unassigned", "mine", "high_intent", "pending_quote", "overdue"];
        if (tabRaw && !tabs.includes(tabRaw as InquiryListTab)) {
          return fail(ApiCode.VALIDATION, "Unsupported inquiry tab.", 400);
        }
        if (intent && !["low", "medium", "high"].includes(intent)) {
          return fail(ApiCode.VALIDATION, "Unsupported intent level.", 400);
        }
        if (!["open", "closed", "all"].includes(status)) {
          return fail(ApiCode.VALIDATION, "Unsupported inquiry status.", 400);
        }
        return ok(await this.runtime.salesApi.listInquiries(context, {
          intent,
          status,
          limit: Number.isFinite(limit) ? limit : undefined,
          unassigned,
          q,
          tab: tabRaw as InquiryListTab | undefined,
        }));
      }
      if (pathname === "/inquiries" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{
          customerName?: string;
          sourceType?: string;
          summary?: string;
          customerContact?: string;
          phone?: string;
          email?: string;
          intentLevel?: "low" | "medium" | "high";
          nextActionAt?: string;
          productNeed?: string;
          budget?: string;
          internalRemark?: string;
          sourceCode?: string;
          quantity?: string;
          deliveryDate?: string;
          channelLabel?: string;
          ownerId?: string | null;
        }>(request);
        if (!body.customerName?.trim()) {
          return fail(ApiCode.VALIDATION, "customerName is required.", 400);
        }
        const sourceTypes: SourceType[] = ["website", "douyin", "wechat", "expo", "sales_link", "other"];
        if (body.sourceType && !sourceTypes.includes(body.sourceType as SourceType)) {
          return fail(ApiCode.VALIDATION, "Unsupported sourceType.", 400);
        }
        if (body.nextActionAt && Number.isNaN(Date.parse(body.nextActionAt))) {
          return fail(ApiCode.VALIDATION, "nextActionAt must be an ISO date.", 400);
        }
        if (body.ownerId) {
          const members = await this.runtime.authApi.listWorkspaceMembers(context);
          if (!members.some((member) => member.userId === body.ownerId)) {
            return fail(ApiCode.VALIDATION, "ownerId is not a member of this workspace.", 400);
          }
        }
        const created = await this.runtime.salesApi.createInquiry(context, {
          customerName: body.customerName.trim(),
          sourceType: body.sourceType as SourceType | undefined,
          summary: body.summary,
          customerContact: body.customerContact,
          phone: body.phone,
          email: body.email,
          intentLevel: body.intentLevel,
          nextActionAt: body.nextActionAt,
          productNeed: body.productNeed,
          budget: body.budget,
          internalRemark: body.internalRemark,
          sourceCode: body.sourceCode,
          quantity: body.quantity,
          deliveryDate: body.deliveryDate,
          channelLabel: body.channelLabel,
          ownerId: body.ownerId,
        });
        await this.runtime.persist();
        return ok(created);
      }

      if (pathname === "/inquiries/assign-stats" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getInquiryAssignStats(context));
      }

      const inquiryMatch = matchPath("/inquiries/:id", pathname);
      if (inquiryMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getInquiry(context, inquiryMatch.params.id));
      }
      if (inquiryMatch && method === "PATCH") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ ownerId?: string | null; nextActionAt?: string | null; status?: "open" | "closed"; sourceCode?: string | null }>(request);
        const updated = await this.runtime.salesApi.updateInquiry(context, inquiryMatch.params.id, body);
        await this.runtime.persist();
        return ok(updated);
      }

      const inquiryFilesMatch = matchPath("/inquiries/:id/files", pathname);
      if (inquiryFilesMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        await this.runtime.salesApi.getInquiry(context, inquiryFilesMatch.params.id);
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return fail(ApiCode.VALIDATION, "请求体应为 multipart/form-data。", 400);
        }
        const file = form.get("file");
        if (!(file instanceof File)) {
          return fail(ApiCode.VALIDATION, "缺少上传文件。", 400);
        }
        const rawCategory = String(form.get("category") ?? "lead");
        const validCategories: DocumentCategory[] = ["brochure", "spec", "quote", "contract", "lead", "other"];
        const category = (validCategories as string[]).includes(rawCategory)
          ? (rawCategory as DocumentCategory)
          : "lead";
        const uploadedBy = String(form.get("uploadedBy") ?? context.userId ?? "unknown");
        const created = this.runtime.fileVaultApi.uploadFile(context.workspaceId, {
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          contentBytes: new Uint8Array(await file.arrayBuffer()),
          category,
          uploadedBy,
        });
        await this.runtime.persist();
        return ok(created);
      }

      // ── Inquiry sub-operations ──
      const assignCandidatesMatch = matchPath("/inquiries/:id/assign-candidates", pathname);
      if (assignCandidatesMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const members = await this.runtime.authApi.listWorkspaceMembers(context);
        return ok(
          await this.runtime.salesApi.getInquiryAssignCandidates(
            context,
            assignCandidatesMatch.params.id,
            members,
          ),
        );
      }

      const assignMatch = matchPath("/inquiries/:id/assign", pathname);
      if (assignMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ ownerId?: string; remark?: string }>(request);
        const updated = await this.runtime.salesApi.assignInquiry(context, assignMatch.params.id, {
          ownerId: body.ownerId ?? "",
          remark: body.remark,
        });
        await this.runtime.persist();
        return ok(updated);
      }
      const missingFieldsMatch = matchPath("/inquiries/:id/request-missing-fields", pathname);
      if (missingFieldsMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        return ok(await this.runtime.salesApi.requestMissingFields(context, missingFieldsMatch.params.id));
      }
      const batchAssignMatch = matchPath("/inquiries/batch-assign", pathname);
      if (batchAssignMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ inquiryIds?: string[]; ownerId?: string; remark?: string }>(request);
        const results = await this.runtime.salesApi.batchAssignInquiries(context, {
          inquiryIds: body.inquiryIds ?? [],
          ownerId: body.ownerId ?? "",
          remark: body.remark,
        });
        await this.runtime.persist();
        return ok(results);
      }
      const inquiryIntentMatch = matchPath("/inquiries/:id/intent-level", pathname);
      if (inquiryIntentMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ intentLevel?: "low" | "medium" | "high" }>(request);
        return ok(await this.runtime.salesApi.setInquiryIntentLevel(context, inquiryIntentMatch.params.id, { intentLevel: body.intentLevel ?? "medium" }));
      }
      const inquiryInvalidMatch = matchPath("/inquiries/:id/invalid", pathname);
      if (inquiryInvalidMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const result = await this.runtime.salesApi.markInquiryInvalid(context, inquiryInvalidMatch.params.id);
        await this.runtime.persist();
        return ok(result);
      }
      const inquiryLostMatch = matchPath("/inquiries/:id/lost", pathname);
      if (inquiryLostMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const result = await this.runtime.salesApi.markInquiryLost(context, inquiryLostMatch.params.id);
        await this.runtime.persist();
        return ok(result);
      }
      const inquiryCustomerMatch = matchPath("/inquiries/:id/customer-info", pathname);
      if (inquiryCustomerMatch && method === "PATCH") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ customerName?: string; customerContact?: string | null }>(request);
        const result = await this.runtime.salesApi.updateInquiryCustomerInfo(context, inquiryCustomerMatch.params.id, body);
        await this.runtime.persist();
        return ok(result);
      }
      const convertToQuoteMatch = matchPath("/inquiries/:id/convert-to-quote", pathname);
      if (convertToQuoteMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ title?: string; estimatedAmount?: number | null }>(request);
        const result = await this.runtime.salesApi.convertInquiryToQuote(context, convertToQuoteMatch.params.id, body);
        await this.runtime.persist();
        return ok(result);
      }

      // ── Quote opportunities ──
      if (pathname === "/quote-opportunities" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const statusRaw = url.searchParams.get("status")?.trim();
        const statuses = ["draft", "to_send", "sent", "to_confirm", "won", "void", "expiring"] as const;
        if (statusRaw && !statuses.includes(statusRaw as (typeof statuses)[number])) {
          return fail(ApiCode.VALIDATION, "Unsupported quote status.", 400);
        }
        const q = url.searchParams.get("q")?.trim() || undefined;
        return ok(
          await this.runtime.salesApi.listQuoteOpportunities(context, {
            status: statusRaw as (typeof statuses)[number] | undefined,
            q,
          }),
        );
      }
      if (pathname === "/quote-opportunities" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{
          inquiryId?: string;
          title?: string;
          estimatedAmount?: number | null;
          templateId?: string | null;
          details?: import("../../sales/sales.types").QuoteDetails | null;
          lineItems?: import("../../sales/sales.types").QuoteDetails["lineItems"];
          taxRate?: number;
          freightAmount?: number;
          installationAmount?: number;
          otherAmount?: number;
          currency?: string;
        }>(request);
        const created = await this.runtime.salesApi.createQuoteOpportunity(context, {
          inquiryId: body.inquiryId ?? "",
          title: body.title,
          estimatedAmount: body.estimatedAmount ?? null,
          templateId: body.templateId ?? null,
          details: body.details ?? null,
          lineItems: body.lineItems,
          taxRate: body.taxRate,
          freightAmount: body.freightAmount,
          installationAmount: body.installationAmount,
          otherAmount: body.otherAmount,
          currency: body.currency,
        });
        await this.runtime.persist();
        return ok(created);
      }

      const quoteMatch = matchPath("/quote-opportunities/:id", pathname);
      if (quoteMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getQuoteOpportunity(context, quoteMatch.params.id));
      }
      if (quoteMatch && method === "PATCH") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<Record<string, unknown>>(request);
        const updated = await this.runtime.salesApi.updateQuoteOpportunity(context, quoteMatch.params.id, body as Parameters<ApiRuntime["salesApi"]["updateQuoteOpportunity"]>[2]);
        await this.runtime.persist();
        return ok(updated);
      }

      const quoteFollowUpMatch = matchPath("/quote-opportunities/:id/follow-ups", pathname);
      if (quoteFollowUpMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ title?: string; body?: string; actor?: string }>(request);
        const updated = await this.runtime.salesApi.addQuoteFollowUp(context, quoteFollowUpMatch.params.id, { title: body.title ?? "跟进记录", body: body.body, actor: body.actor });
        await this.runtime.persist();
        return ok(updated);
      }

      // ── Quote sub-operations ──
      const quoteCopyMatch = matchPath("/quote-opportunities/:id/copy", pathname);
      if (quoteCopyMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const result = await this.runtime.salesApi.copyQuote(context, quoteCopyMatch.params.id);
        await this.runtime.persist();
        return ok(result);
      }
      const quoteSendMatch = matchPath("/quote-opportunities/:id/send", pathname);
      if (quoteSendMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{
          quotedAmount?: number | null;
          recipient?: string;
          channel?: "email" | "link";
          subject?: string;
          body?: string;
          text?: string;
        }>(request);
        const document = await this.runtime.salesApi.getQuoteDocument(context, quoteSendMatch.params.id);
        await attachWorkspaceLogo(this.runtime, context.userId, context.workspaceId, document);
        const pdf = await renderQuotePdf(document);
        const stored = await this.runtime.documentStorage.save({ workspaceId: context.workspaceId, knowledgeBaseId: "quote-documents", fileName: `${quoteSendMatch.params.id}.pdf`, contentBytes: pdf });
        let documentId: string | null = null;
        let finalDeliveryStatus: "sent" | "queued" | "not_requested" = body.recipient ? "queued" : "not_requested";
        const mailSubject = body.subject?.trim() || `报价单 ${document.sample.quoteNo}`;
        const mailText =
          body.body?.trim() ||
          body.text?.trim() ||
          `您好，附件是报价单 ${document.sample.quoteNo}，请查收。`;
        if (this.runtime.driver === "postgres") {
          documentId = `qd_${randomUUID()}`;
          const versions = await pgQuery(`select coalesce(max(version), 0) + 1 as version from quote_documents where workspace_id = $1 and quote_opportunity_id = $2`, [context.workspaceId, quoteSendMatch.params.id]);
          await pgQuery(`insert into quote_documents (id, workspace_id, quote_opportunity_id, version, storage_key, file_name, size_bytes, content_hash, created_by)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [documentId, context.workspaceId, quoteSendMatch.params.id, Number(versions[0]?.version ?? 1), stored.storageKey, `quote-${quoteSendMatch.params.id}.pdf`, pdf.byteLength, createHash("sha256").update(pdf).digest("hex"), context.userId]);
          if (body.recipient) {
            const deliveryId = `qdl_${randomUUID()}`;
            await pgQuery(`insert into quote_delivery_logs (id, workspace_id, quote_opportunity_id, quote_document_id, channel, recipient, status)
              values ($1,$2,$3,$4,$5,$6,'queued')`, [deliveryId, context.workspaceId, quoteSendMatch.params.id, documentId, body.channel ?? "email", body.recipient]);
            try {
              const deliveryStatus = body.channel === "link" ? "queued" : await sendQuoteEmail({
                recipient: body.recipient,
                subject: mailSubject,
                text: mailText,
                fileName: `quote-${quoteSendMatch.params.id}.pdf`,
                pdfBytes: pdf,
              });
              finalDeliveryStatus = deliveryStatus;
              await pgQuery(`update quote_delivery_logs set status = $1, delivered_at = case when $1 = 'sent' then now() else null end where id = $2`, [deliveryStatus, deliveryId]);
            } catch (error) {
              await pgQuery(`update quote_delivery_logs set status = 'failed', error_message = $1 where id = $2`, [error instanceof Error ? error.message : String(error), deliveryId]);
              throw error;
            }
          }
        }
        const result = await this.runtime.salesApi.sendQuote(context, quoteSendMatch.params.id, body);
        await this.runtime.persist();
        return ok({ ...result, documentId, storageKey: stored.storageKey, deliveryStatus: finalDeliveryStatus });
      }
      const quoteDealMatch = matchPath("/quote-opportunities/:id/deal", pathname);
      if (quoteDealMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ wonAmount?: number | null }>(request);
        const result = await this.runtime.salesApi.dealQuote(context, quoteDealMatch.params.id, body);
        await this.runtime.persist();
        return ok(result);
      }
      const quoteLostMatch = matchPath("/quote-opportunities/:id/lost", pathname);
      if (quoteLostMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ lostReason?: string }>(request);
        const result = await this.runtime.salesApi.markQuoteLost(context, quoteLostMatch.params.id, { lostReason: (body.lostReason as LostReason) ?? undefined });
        await this.runtime.persist();
        return ok(result);
      }
      const quoteVoidMatch = matchPath("/quote-opportunities/:id/void", pathname);
      if (quoteVoidMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const result = await this.runtime.salesApi.voidQuote(context, quoteVoidMatch.params.id);
        await this.runtime.persist();
        return ok(result);
      }
      const quoteValidUntilMatch = matchPath("/quote-opportunities/:id/valid-until", pathname);
      if (quoteValidUntilMatch && method === "PATCH") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ quoteDueAt?: string }>(request);
        const result = await this.runtime.salesApi.updateQuoteValidUntil(context, quoteValidUntilMatch.params.id, { quoteDueAt: body.quoteDueAt ?? new Date().toISOString() });
        await this.runtime.persist();
        return ok(result);
      }
      const quoteDocumentMatch = matchPath("/quote-opportunities/:id/document", pathname);
      if (quoteDocumentMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getQuoteDocument(context, quoteDocumentMatch.params.id));
      }
      const quoteDocumentHtmlMatch = matchPath("/quote-opportunities/:id/document.html", pathname);
      if (quoteDocumentHtmlMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const document = await this.runtime.salesApi.getQuoteDocument(context, quoteDocumentHtmlMatch.params.id);
        return {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          text: document.html,
        };
      }

      const quotePdfMatch = matchPath("/quote-opportunities/:id/pdf", pathname);
      if (quotePdfMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const document = await this.runtime.salesApi.getQuoteDocument(context, quotePdfMatch.params.id);
        await attachWorkspaceLogo(this.runtime, context.userId, context.workspaceId, document);
        const bytes = await renderQuotePdf(document);
        return {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `inline; filename="quote-${quotePdfMatch.params.id}.pdf"`,
            "content-length": String(bytes.byteLength),
          },
          bytes,
        };
      }

      const quoteDocumentsMatch = matchPath("/quote-opportunities/:id/documents", pathname);
      if (quoteDocumentsMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        await this.runtime.salesApi.getQuoteOpportunity(context, quoteDocumentsMatch.params.id);
        if (this.runtime.driver !== "postgres") return ok([]);
        return ok(await pgQuery(`select id, version, file_name, size_bytes, content_hash, created_by, created_at
          from quote_documents where workspace_id = $1 and quote_opportunity_id = $2 order by version desc`, [context.workspaceId, quoteDocumentsMatch.params.id]));
      }
      if (quoteDocumentsMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{ label?: string }>(request);
        await this.runtime.salesApi.getQuoteOpportunity(context, quoteDocumentsMatch.params.id);
        const document = await this.runtime.salesApi.getQuoteDocument(context, quoteDocumentsMatch.params.id);
        await attachWorkspaceLogo(this.runtime, context.userId, context.workspaceId, document);
        const pdf = await renderQuotePdf(document);
        const label = body.label?.trim();
        const fileName = label
          ? `${label.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80)}.pdf`
          : `quote-${quoteDocumentsMatch.params.id}.pdf`;
        const stored = await this.runtime.documentStorage.save({
          workspaceId: context.workspaceId,
          knowledgeBaseId: "quote-documents",
          fileName,
          contentBytes: pdf,
        });
        if (this.runtime.driver !== "postgres") {
          return ok({
            id: `qd_${randomUUID()}`,
            version: 1,
            fileName,
            sizeBytes: pdf.byteLength,
            storageKey: stored.storageKey,
            driver: "memory",
          });
        }
        const documentId = `qd_${randomUUID()}`;
        const versions = await pgQuery(
          `select coalesce(max(version), 0) + 1 as version from quote_documents where workspace_id = $1 and quote_opportunity_id = $2`,
          [context.workspaceId, quoteDocumentsMatch.params.id],
        );
        const version = Number(versions[0]?.version ?? 1);
        await pgQuery(
          `insert into quote_documents (id, workspace_id, quote_opportunity_id, version, storage_key, file_name, size_bytes, content_hash, created_by)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            documentId,
            context.workspaceId,
            quoteDocumentsMatch.params.id,
            version,
            stored.storageKey,
            fileName,
            pdf.byteLength,
            createHash("sha256").update(pdf).digest("hex"),
            context.userId,
          ],
        );
        return ok({
          id: documentId,
          version,
          fileName,
          sizeBytes: pdf.byteLength,
          storageKey: stored.storageKey,
        });
      }
      const quoteDocumentDownloadMatch = matchPath("/quote-opportunities/:id/documents/:documentId/download", pathname);
      if (quoteDocumentDownloadMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        if (this.runtime.driver !== "postgres") return fail(ApiCode.NOT_FOUND, "Quote document not found.", 404);
        const rows = await pgQuery(`select * from quote_documents where id = $1 and quote_opportunity_id = $2 and workspace_id = $3`, [quoteDocumentDownloadMatch.params.documentId, quoteDocumentDownloadMatch.params.id, context.workspaceId]);
        if (!rows[0]) return fail(ApiCode.NOT_FOUND, "Quote document not found.", 404);
        const bytes = await this.runtime.documentStorage.read(String(rows[0].storage_key), context.workspaceId);
        return { status: 200, headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${String(rows[0].file_name)}"` }, bytes };
      }

      const quoteAttachmentsMatch = matchPath("/quote-opportunities/:id/attachments", pathname);
      if (quoteAttachmentsMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const quote = await this.runtime.salesApi.getQuoteOpportunity(context, quoteAttachmentsMatch.params.id);
        if (this.runtime.driver !== "postgres") {
          const meta = (quote as { details?: { attachments?: Array<Record<string, unknown>> } }).details?.attachments ?? [];
          return ok(
            meta.map((item) => ({
              id: String(item.id),
              fileName: String(item.fileName),
              fileType: String(item.fileType ?? "application/octet-stream"),
              sizeBytes: Number(item.sizeBytes) || 0,
              createdAt: item.createdAt ?? null,
            })),
          );
        }
        const rows = await pgQuery(
          `select id, file_name, file_type, size_bytes, created_by, created_at
             from quote_attachments
            where workspace_id = $1 and quote_opportunity_id = $2
            order by created_at desc`,
          [context.workspaceId, quoteAttachmentsMatch.params.id],
        );
        return ok(
          rows.map((row) => ({
            id: String(row.id),
            fileName: String(row.file_name),
            fileType: String(row.file_type),
            sizeBytes: Number(row.size_bytes) || 0,
            createdBy: row.created_by ?? null,
            createdAt: row.created_at,
          })),
        );
      }
      if (quoteAttachmentsMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const quote = await this.runtime.salesApi.getQuoteOpportunity(context, quoteAttachmentsMatch.params.id);
        const files = await readUploadBody(request);
        const file = files[0];
        if (!file?.fileName || !file.contentBytes) {
          return fail(ApiCode.VALIDATION, "Attachment file is required.", 400);
        }
        const maxBytes = 20 * 1024 * 1024;
        if (file.sizeBytes > maxBytes || file.contentBytes.byteLength > maxBytes) {
          return fail(ApiCode.VALIDATION, "Attachment must be under 20MB.", 400);
        }
        const stored = await this.runtime.documentStorage.save({
          workspaceId: context.workspaceId,
          knowledgeBaseId: "quote-attachments",
          fileName: file.fileName,
          contentBytes: file.contentBytes,
        });
        const attachmentId = `qatt_${randomUUID()}`;
        const createdAt = new Date().toISOString();
        const contentHash = createHash("sha256").update(file.contentBytes).digest("hex");
        if (this.runtime.driver === "postgres") {
          await pgQuery(
            `insert into quote_attachments
              (id, workspace_id, quote_opportunity_id, storage_key, file_name, file_type, size_bytes, content_hash, created_by)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              attachmentId,
              context.workspaceId,
              quoteAttachmentsMatch.params.id,
              stored.storageKey,
              file.fileName,
              file.fileType || "application/octet-stream",
              file.contentBytes.byteLength,
              contentHash,
              context.userId,
            ],
          );
        }
        const details = ((quote as { details?: import("../../sales/sales.types").QuoteDetails }).details ?? {});
        const nextAttachments = [
          ...(details.attachments ?? []),
          {
            id: attachmentId,
            fileName: file.fileName,
            fileType: file.fileType || "application/octet-stream",
            sizeBytes: file.contentBytes.byteLength,
            storageKey: stored.storageKey,
            createdAt,
          },
        ];
        const nextIds = [...(details.attachmentIds ?? []), attachmentId];
        await this.runtime.salesApi.updateQuoteOpportunity(context, quoteAttachmentsMatch.params.id, {
          details: {
            ...details,
            attachmentIds: nextIds,
            attachments: nextAttachments,
          },
        });
        await this.runtime.persist();
        return ok({
          id: attachmentId,
          fileName: file.fileName,
          fileType: file.fileType || "application/octet-stream",
          sizeBytes: file.contentBytes.byteLength,
          createdAt,
        });
      }

      const quoteAttachmentDownloadMatch = matchPath(
        "/quote-opportunities/:id/attachments/:attachmentId/download",
        pathname,
      );
      if (quoteAttachmentDownloadMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        const quoteId = quoteAttachmentDownloadMatch.params.id;
        const attachmentId = quoteAttachmentDownloadMatch.params.attachmentId;
        let storageKey: string | null = null;
        let fileName = "attachment";
        let fileType = "application/octet-stream";
        if (this.runtime.driver === "postgres") {
          const rows = await pgQuery(
            `select storage_key, file_name, file_type from quote_attachments
              where id = $1 and quote_opportunity_id = $2 and workspace_id = $3`,
            [attachmentId, quoteId, context.workspaceId],
          );
          if (!rows[0]) return fail(ApiCode.NOT_FOUND, "Quote attachment not found.", 404);
          storageKey = String(rows[0].storage_key);
          fileName = String(rows[0].file_name);
          fileType = String(rows[0].file_type || fileType);
        } else {
          const quote = await this.runtime.salesApi.getQuoteOpportunity(context, quoteId);
          const meta = ((quote as { details?: { attachments?: Array<Record<string, unknown>> } }).details
            ?.attachments ?? []).find((item) => String(item.id) === attachmentId);
          if (!meta?.storageKey) return fail(ApiCode.NOT_FOUND, "Quote attachment not found.", 404);
          storageKey = String(meta.storageKey);
          fileName = String(meta.fileName ?? fileName);
          fileType = String(meta.fileType ?? fileType);
        }
        const bytes = await this.runtime.documentStorage.read(storageKey, context.workspaceId);
        return {
          status: 200,
          headers: {
            "content-type": fileType,
            "content-disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
          },
          bytes,
        };
      }

      const quoteDeliveryLogsMatch = matchPath("/quote-opportunities/:id/delivery-logs", pathname);
      if (quoteDeliveryLogsMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        if (this.runtime.driver !== "postgres") return ok([]);
        return ok(await pgQuery(`select * from quote_delivery_logs where workspace_id = $1 and quote_opportunity_id = $2 order by created_at desc`, [context.workspaceId, quoteDeliveryLogsMatch.params.id]));
      }
      const quoteDeliveryRetryMatch = matchPath("/quote-opportunities/:id/delivery-logs/:logId/retry", pathname);
      if (quoteDeliveryRetryMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        if (this.runtime.driver !== "postgres") return fail(ApiCode.NOT_FOUND, "Delivery log not found.", 404);
        const rows = await pgQuery(`select l.*, d.storage_key, d.file_name from quote_delivery_logs l
          left join quote_documents d on d.id = l.quote_document_id
          where l.id = $1 and l.quote_opportunity_id = $2 and l.workspace_id = $3`, [quoteDeliveryRetryMatch.params.logId, quoteDeliveryRetryMatch.params.id, context.workspaceId]);
        const delivery = rows[0];
        if (!delivery?.storage_key) return fail(ApiCode.NOT_FOUND, "Delivery log or quote document not found.", 404);
        try {
          const pdfBytes = await this.runtime.documentStorage.read(String(delivery.storage_key), context.workspaceId);
          const status = String(delivery.channel) === "link" ? "queued" : await sendQuoteEmail({
            recipient: String(delivery.recipient), subject: "报价单", text: "您好，附件是重新发送的报价单，请查收。",
            fileName: String(delivery.file_name), pdfBytes,
          });
          const updated = await pgQuery(`update quote_delivery_logs set status = $1, error_message = null,
            delivered_at = case when $1 = 'sent' then now() else null end where id = $2 returning *`, [status, delivery.id]);
          return ok(updated[0]);
        } catch (error) {
          const updated = await pgQuery(`update quote_delivery_logs set status = 'failed', error_message = $1 where id = $2 returning *`, [error instanceof Error ? error.message : String(error), delivery.id]);
          return ok(updated[0]);
        }
      }
      const publicTokenMatch = matchPath("/quote-opportunities/:id/public-token", pathname);
      if (publicTokenMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const result = await this.runtime.salesApi.createQuotePublicLink(
          context,
          publicTokenMatch.params.id,
        );
        await this.runtime.persist();
        return ok(result);
      }

      // ── Quote templates ──
      if (pathname === "/quote-templates" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.listQuoteTemplates(context));
      }
      if (pathname === "/quote-templates" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<{
          templateName?: string;
          companyName?: string;
          description?: string;
          themeColor?: string;
          logoPosition?: string;
          showCompanyInfo?: boolean;
          showCustomerInfo?: boolean;
          fields?: string[];
          terms?: { payment?: string; delivery?: string; validity?: string };
          isDefault?: boolean;
        }>(request);
        if (!body.templateName?.trim()) {
          return fail(ApiCode.VALIDATION, "templateName is required.", 400);
        }
        const created = await this.runtime.salesApi.createQuoteTemplate(context, {
          templateName: body.templateName.trim(),
          companyName: body.companyName,
          description: body.description,
          themeColor: body.themeColor,
          logoPosition: body.logoPosition as "left" | "center" | "right" | undefined,
          showCompanyInfo: body.showCompanyInfo,
          showCustomerInfo: body.showCustomerInfo,
          fields: body.fields,
          terms: body.terms,
          isDefault: body.isDefault,
        });
        await this.runtime.persist();
        return ok(created);
      }

      const templateMatch = matchPath("/quote-templates/:id", pathname);
      if (templateMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getQuoteTemplate(context, templateMatch.params.id));
      }
      if (templateMatch && method === "PATCH") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const body = await readJsonBody<Record<string, unknown>>(request);
        const updated = await this.runtime.salesApi.updateQuoteTemplate(
          context,
          templateMatch.params.id,
          body as Parameters<ApiRuntime["salesApi"]["updateQuoteTemplate"]>[2],
        );
        await this.runtime.persist();
        return ok(updated);
      }
      if (templateMatch && method === "DELETE") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const result = await this.runtime.salesApi.deleteQuoteTemplate(context, templateMatch.params.id);
        await this.runtime.persist();
        return ok(result);
      }

      const templatePreviewMatch = matchPath("/quote-templates/:id/preview", pathname);
      if (templatePreviewMatch && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.previewQuoteTemplate(context, templatePreviewMatch.params.id));
      }

      const templateDefaultMatch = matchPath("/quote-templates/:id/set-default", pathname);
      if (templateDefaultMatch && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertWriteRole(context.role);
        const updated = await this.runtime.salesApi.setDefaultQuoteTemplate(
          context,
          templateDefaultMatch.params.id,
        );
        await this.runtime.persist();
        return ok(updated);
      }

      // ── Sales assistant ──
      if (pathname === "/sales-assistant/analyze" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        const body = await readJsonBody<{ text?: string }>(request);
        return ok(await this.runtime.salesApi.analyzeAssistant(context, { text: body.text ?? "" }));
      }
      if (pathname === "/sales-assistant/reply-draft" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        const body = await readJsonBody<{ text?: string }>(request);
        return ok(await this.runtime.salesApi.createAssistantReplyDraft(context, { text: body.text ?? "" }));
      }
      if (pathname === "/sales-assistant/create-requirement-sheet" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        const body = await readJsonBody<{ text?: string }>(request);
        return ok(await this.runtime.salesApi.createRequirementSheet(context, { text: body.text ?? "" }));
      }

      // ── Sources ──
      if (pathname === "/sources" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.listSources(context));
      }
      if (pathname === "/sources" && method === "POST") {
        const context = await this.authContext.resolve(request.headers);
        assertManagerRole(context.role);
        const body = await readJsonBody<{ code?: string; label?: string; sourceType?: string }>(request);
        const sourceType: SourceType = ["website", "douyin", "wechat", "expo", "sales_link", "other"].includes(String(body.sourceType)) ? body.sourceType as SourceType : "other";
        const created = await this.runtime.salesApi.createSource(context, { code: body.code ?? "", label: body.label ?? "", sourceType });
        await this.runtime.persist();
        return ok(created);
      }

      // ── Customer & settings ──
      if (pathname === "/customer-opportunities" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.listCustomerOpportunities(context));
      }
      if (pathname === "/customer-operations/recommendations" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getCustomerRecommendations(context));
      }
      if (pathname === "/settings/business-rules" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        return ok(await this.runtime.salesApi.getBusinessRules(context));
      }
      if (pathname === "/settings/business-rules" && method === "PATCH") {
        const context = await this.authContext.resolve(request.headers);
        assertManagerRole(context.role);
        const body = await readJsonBody<Record<string, unknown>>(request);
        const updated = await this.runtime.salesApi.updateBusinessRules(context, body as Parameters<ApiRuntime["salesApi"]["updateBusinessRules"]>[1]);
        await this.runtime.persist();
        return ok(updated);
      }
    } catch (error) {
      const mapped = toSalesHttpError(error);
      const apiCode = mapped.statusCode === 404 ? ApiCode.NOT_FOUND
        : mapped.statusCode === 400 ? ApiCode.VALIDATION
        : ApiCode.INTERNAL;
      return fail(apiCode, mapped.message, mapped.statusCode);
    }

    return null;
  }
}
