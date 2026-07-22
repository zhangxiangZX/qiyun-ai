import { Inject, Injectable } from "@nestjs/common";

import { runWithBypassRls } from "../../db/tenant-context";
import { query as pgQuery } from "../../db/pg";
import { randomUUID } from "node:crypto";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { matchPath, type ApiResult } from "../../http/api-result";
import { readJsonBody } from "../../http/request-body";
import type { ApiRuntime } from "../../runtime";
import type { ScanLogSource } from "../../sales-links/sales-links.types";
import { API_RUNTIME } from "../runtime/runtime.tokens";

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

@Injectable()
export class PublicRouteService {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    const quoteMatch = matchPath("/public/quotes/:token", pathname);
    if (quoteMatch && method === "GET") {
      const quote = await runWithBypassRls(() =>
        this.runtime.salesApi
          .getPublicQuoteByToken(quoteMatch.params.token)
          .catch(() => null),
      );
      if (!quote) return fail(ApiCode.NOT_FOUND, "Quote not found.", 404);
      await this.runtime.persist();
      return ok(quote);
    }

    const quoteHtmlMatch = matchPath("/public/quotes/:token/document.html", pathname);
    if (quoteHtmlMatch && method === "GET") {
      const quote = await runWithBypassRls(() =>
        this.runtime.salesApi
          .getPublicQuoteByToken(quoteHtmlMatch.params.token)
          .catch(() => null),
      );
      if (!quote?.document?.html) return fail(ApiCode.NOT_FOUND, "Quote not found.", 404);
      await this.runtime.persist();
      return {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        text: quote.document.html,
      };
    }

    const confirmMatch = matchPath("/public/quotes/:token/confirm", pathname);
    if (confirmMatch && method === "POST") {
      const body = await readJsonBody<{ action?: string }>(request).catch(
        () => ({ action: undefined } as { action?: string }),
      );
      const result = await runWithBypassRls(() =>
        this.runtime.salesApi
          .confirmPublicQuoteByToken(confirmMatch.params.token, body)
          .catch(() => null),
      );
      if (!result) return fail(ApiCode.NOT_FOUND, "Quote not found.", 404);
      await this.runtime.persist();
      return ok(result);
    }

    const spMatch = matchPath("/public/selection-pages/:slug", pathname);
    if (spMatch && method === "GET") {
      const page = await runWithBypassRls(() =>
        this.runtime.selectionPagesApi.getBySlug(spMatch.params.slug),
      );
      if (!page) return fail(ApiCode.NOT_FOUND, "Page not found.", 404);
      return ok(page);
    }

    const spSubmitMatch = matchPath("/public/selection-pages/:slug/submit", pathname);
    if (spSubmitMatch && method === "POST") {
      const body = await readJsonBody<{
        answers?: Record<string, string>;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        attachmentIds?: string[];
        source?: string;
      }>(request);
      try {
        const submission = await runWithBypassRls(() =>
          this.runtime.selectionPagesApi.submit(spSubmitMatch.params.slug, {
            answers: body.answers ?? {},
            contactName: body.contactName,
            contactPhone: body.contactPhone,
            contactEmail: body.contactEmail,
            attachmentIds: body.attachmentIds,
            source: body.source,
          }),
        );
        if (this.runtime.driver === "postgres" && submission.inquiryId) {
          const taskId = `ft_${randomUUID()}`;
          await runWithBypassRls(async () => {
            const pages = await pgQuery(`select workspace_id from selection_pages where id = $1`, [submission.selectionPageId]);
            const workspaceId = String(pages[0]?.workspace_id ?? "");
            if (workspaceId) {
              await pgQuery(`insert into follow_tasks (id, workspace_id, inquiry_id, title, status, due_at)
                values ($1,$2,$3,$4,'pending',now() + interval '30 minutes')`, [taskId, workspaceId, submission.inquiryId, "首次跟进：AI选型客户"]);
              await pgQuery(`update selection_submissions set follow_task_id = $1 where id = $2`, [taskId, submission.id]);
              submission.followTaskId = taskId;
            }
          });
        }
        return ok(submission);
      } catch {
        return fail(ApiCode.NOT_FOUND, "Page not found or not published.", 404);
      }
    }

    const slMatch = matchPath("/public/sales-links/:slug", pathname);
    if (slMatch && method === "GET") {
      const link = await runWithBypassRls(() =>
        this.runtime.salesLinksApi.getBySlug(slMatch.params.slug),
      );
      if (!link || link.status !== "active") {
        return fail(ApiCode.NOT_FOUND, "Sales link not found.", 404);
      }
      if (!isSafeHttpUrl(link.targetUrl)) {
        return fail(ApiCode.BAD_REQUEST, "Sales link has no safe destination.", 400);
      }
      await runWithBypassRls(() => {
        const requestUrl = new URL(request.url);
        const srcParam =
          requestUrl.searchParams.get("src") ??
          requestUrl.searchParams.get("source") ??
          requestUrl.searchParams.get("ref");
        const source: ScanLogSource =
          srcParam === "qrcode" || srcParam === "qr" || srcParam === "scan"
            ? "qrcode"
            : "link";
        const referer =
          request.headers.get("referer") ??
          request.headers.get("referrer") ??
          null;
        const userAgent = request.headers.get("user-agent") ?? null;
        return this.runtime.salesLinksApi.recordScan(slMatch.params.slug, {
          source,
          referer,
          userAgent,
        });
      }).catch(() => {});
      const destination = new URL(link.targetUrl);
      if (!destination.searchParams.has("source")) {
        destination.searchParams.set("source", `sales_link:${slMatch.params.slug}`);
      }
      return {
        status: 302,
        headers: {
          location: destination.toString(),
          "cache-control": "no-store",
        },
      };
    }

    return null;
  }
}
