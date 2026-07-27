import { Inject, Injectable } from "@nestjs/common";
import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { query as pgQuery } from "../../db/pg";
import { randomUUID } from "node:crypto";
import { resolveSelectionAcquisitionSource } from "../../selection-pages/selection-pages.service";

function assertManagerRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin") throw new AuthAccessError("Manager access required.");
}

@Injectable()
export class SelectionPagesRouteService {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
              @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/selection-pages" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.selectionPagesApi.list(ctx));
    }
    if (pathname === "/selection-pages" && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      assertManagerRole(ctx.role);
      const body = await readJsonBody<Record<string, unknown>>(request);
      const created = await this.runtime.selectionPagesApi.create(ctx, body as Parameters<ApiRuntime["selectionPagesApi"]["create"]>[1]);
      await this.runtime.persist();
      return ok(created);
    }

    const pageMatch = matchPath("/selection-pages/:id", pathname);
    if (pageMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.selectionPagesApi.getById(ctx, pageMatch.params.id));
    }
    if (pageMatch && method === "PATCH") {
      const ctx = await this.authContext.resolve(request.headers);
      assertManagerRole(ctx.role);
      const body = await readJsonBody<Record<string, unknown>>(request);
      const updated = await this.runtime.selectionPagesApi.update(ctx, pageMatch.params.id, body);
      await this.runtime.persist();
      return ok(updated);
    }
    if (pageMatch && method === "DELETE") {
      const ctx = await this.authContext.resolve(request.headers);
      assertManagerRole(ctx.role);
      const result = await this.runtime.selectionPagesApi.delete(ctx, pageMatch.params.id);
      await this.runtime.persist();
      return ok(result);
    }

    const subMatch = matchPath("/selection-pages/:id/submissions", pathname);
    if (subMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.selectionPagesApi.listSubmissions(ctx, subMatch.params.id));
    }

    const submissionMatch = matchPath("/selection-pages/:id/submissions/:submissionId", pathname);
    if (submissionMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      await this.runtime.selectionPagesApi.getById(ctx, submissionMatch.params.id);
      if (this.runtime.driver === "postgres") {
        const rows = await pgQuery(`select s.* from selection_submissions s join selection_pages p on p.id = s.selection_page_id
          where s.id = $1 and p.id = $2 and p.workspace_id = $3 and s.deleted_at is null`,
        [submissionMatch.params.submissionId, submissionMatch.params.id, ctx.workspaceId]);
        return rows[0] ? ok(rows[0]) : { status: 404, body: { code: "NOT_FOUND", message: "Submission not found." } };
      }
      const item = (await this.runtime.selectionPagesApi.listSubmissions(ctx, submissionMatch.params.id)).find((entry) => entry.id === submissionMatch.params.submissionId);
      return item ? ok(item) : { status: 404, body: { code: "NOT_FOUND", message: "Submission not found." } };
    }

    const submissionActionMatch = matchPath("/selection-pages/:id/submissions/:submissionId/:action", pathname);
    if (submissionActionMatch && method === "GET" && submissionActionMatch.params.action === "attachments") {
      const ctx = await this.authContext.resolve(request.headers);
      const submission = (await this.runtime.selectionPagesApi.listSubmissions(ctx, submissionActionMatch.params.id)).find((entry) => entry.id === submissionActionMatch.params.submissionId);
      if (!submission) return { status: 404, body: { code: "NOT_FOUND", message: "Submission not found." } };
      return ok(submission.attachmentIds.map((fileId) => this.runtime.fileVaultRepository.getMeta(ctx.workspaceId, fileId)).filter(Boolean));
    }
    if (submissionActionMatch && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      assertManagerRole(ctx.role);
      const action = submissionActionMatch.params.action;
      if (!["assign", "archive", "retry-conversion"].includes(action)) return null;
      const body = await readJsonBody<{ ownerId?: string }>(request);
      const submission = (await this.runtime.selectionPagesApi.listSubmissions(ctx, submissionActionMatch.params.id)).find((entry) => entry.id === submissionActionMatch.params.submissionId);
      if (!submission) return { status: 404, body: { code: "NOT_FOUND", message: "Submission not found." } };
      if (action === "assign") {
        if (!submission.inquiryId || !body.ownerId) return { status: 400, body: { code: "VALIDATION_ERROR", message: "Converted inquiry and ownerId are required." } };
        const members = await this.runtime.authApi.listWorkspaceMembers(ctx);
        if (!members.some((member) => member.userId === body.ownerId)) return { status: 400, body: { code: "VALIDATION_ERROR", message: "ownerId is not a member of this workspace." } };
        await this.runtime.salesApi.assignInquiry(ctx, submission.inquiryId, { ownerId: body.ownerId });
      }
      if (this.runtime.driver === "postgres" && action === "archive") {
        await pgQuery(`update selection_submissions set status = 'archived' where id = $1 and selection_page_id = $2`, [submission.id, submission.selectionPageId]);
        submission.status = "archived";
      }
      if (action === "retry-conversion" && !submission.inquiryId) {
        const page = await this.runtime.selectionPagesApi.getById(ctx, submissionActionMatch.params.id);
        const summary = Object.entries(submission.answers).map(([key, value]) => `${key}: ${value}`).join("\n");
        const acquisition = resolveSelectionAcquisitionSource(submission.answers.source, page.slug);
        const inquiry = await this.runtime.salesApi.createInquiry(ctx, {
          customerName: submission.contactName ?? "AI选型客户", customerContact: submission.contactName,
          phone: submission.contactPhone, email: submission.contactEmail, sourceType: acquisition.sourceType,
          sourceCode: acquisition.sourceCode, summary, productNeed: summary,
          knownFields: { selectionPageId: page.id, attachmentIds: submission.attachmentIds.join(",") },
        });
        submission.inquiryId = inquiry.id;
        submission.status = "converted";
        if (this.runtime.driver === "postgres") {
          const taskId = `ft_${randomUUID()}`;
          await pgQuery(`insert into follow_tasks (id, workspace_id, inquiry_id, title, status, due_at, created_by) values ($1,$2,$3,$4,'pending',now() + interval '30 minutes',$5)`, [taskId, ctx.workspaceId, inquiry.id, `首次跟进：${inquiry.customerName ?? "AI选型客户"}`, ctx.userId]);
          await pgQuery(`update selection_submissions set inquiry_id = $1, follow_task_id = $2, status = 'converted' where id = $3 and selection_page_id = $4`, [inquiry.id, taskId, submission.id, submission.selectionPageId]);
          submission.followTaskId = taskId;
        }
      }
      await this.runtime.persist();
      return ok(submission);
    }

    return null;
  }
}
