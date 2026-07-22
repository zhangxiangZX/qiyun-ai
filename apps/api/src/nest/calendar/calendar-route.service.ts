import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { json, matchPath, type ApiResult } from "../../http/api-result";
import { readJsonBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { query as pgQuery } from "../../db/pg";
import { randomUUID } from "node:crypto";

function assertWriteRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin" && role !== "member") {
    throw new AuthAccessError("Workspace member write access is required.");
  }
}

@Injectable()
export class CalendarRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string, requestId?: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/follow-tasks" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const url = new URL(request.url);
      if (this.runtime.driver === "postgres") {
        const status = url.searchParams.get("status");
        const inquiryId = url.searchParams.get("inquiryId");
        const rows = await pgQuery(`select * from follow_tasks where workspace_id = $1
          and ($2::text is null or status = $2) and ($3::text is null or inquiry_id = $3)
          order by due_at asc`, [context.workspaceId, status, inquiryId]);
        return json(200, rows, requestId);
      }
      const events = await this.runtime.calendarApi.listEvents(
        context.workspaceId,
        url.searchParams.get("from") ?? undefined,
        url.searchParams.get("to") ?? undefined,
      );
      const status = url.searchParams.get("status");
      const inquiryId = url.searchParams.get("inquiryId");
      return json(200, events.filter((event) => event.kind === "follow_up")
        .filter((event) => !status || event.status === status)
        .filter((event) => !inquiryId || event.leadId === inquiryId), requestId);
    }

    if (pathname === "/follow-tasks" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const body = await readJsonBody<{ title?: string; dueAt?: string; inquiryId?: string; customerName?: string; ownerName?: string; note?: string; priority?: "low" | "medium" | "high" }>(request);
      if (!body.title?.trim() || !body.dueAt || Number.isNaN(Date.parse(body.dueAt))) {
        return json(400, { code: "VALIDATION_ERROR", message: "title and valid dueAt are required." }, requestId);
      }
      const start = new Date(body.dueAt);
      if (this.runtime.driver === "postgres") {
        const id = `ft_${randomUUID()}`;
        await pgQuery(`insert into follow_tasks (id, workspace_id, inquiry_id, assignee_user_id, title, priority, status, due_at, created_by, note)
          values ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)`,
        [id, context.workspaceId, body.inquiryId ?? null, null, body.title.trim(), body.priority ?? "medium", start.toISOString(), context.userId, body.note?.trim() || null]);
        return json(201, { id, workspaceId: context.workspaceId, inquiryId: body.inquiryId ?? null, title: body.title.trim(), priority: body.priority ?? "medium", note: body.note?.trim() || null, status: "pending", dueAt: start.toISOString() }, requestId);
      }
      const created = await this.runtime.calendarApi.createEvent(context.workspaceId, {
        title: body.title.trim(), start: start.toISOString(),
        end: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        kind: "follow_up", status: "pending", leadId: body.inquiryId,
        leadName: body.customerName, ownerName: body.ownerName, note: body.note,
      });
      await this.runtime.persist();
      return json(201, created, requestId);
    }

    const followActionMatch = matchPath("/follow-tasks/:id/:action", pathname);
    if (followActionMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const action = followActionMatch.params.action;
      const body = await readJsonBody<{ dueAt?: string; note?: string }>(request);
      if (!["complete", "delay", "cancel"].includes(action)) return null;
      if (action === "delay" && (!body.dueAt || Number.isNaN(Date.parse(body.dueAt)))) {
        return json(400, { code: "VALIDATION_ERROR", message: "valid dueAt is required for delay." }, requestId);
      }
      if (this.runtime.driver === "postgres") {
        const status = action === "complete" ? "done" : action === "cancel" ? "cancelled" : "pending";
        const rows = await pgQuery(`update follow_tasks set status = $1,
          due_at = case when $2::timestamptz is null then due_at else $2 end,
          completed_at = case when $1 = 'done' then now() else completed_at end,
          completion_result = case when $1 = 'done' then $3 else completion_result end,
          delay_reason = case when $4 = 'delay' then $3 else delay_reason end,
          cancel_reason = case when $1 = 'cancelled' then $3 else cancel_reason end,
          updated_at = now() where id = $5 and workspace_id = $6 returning *`,
        [status, body.dueAt ?? null, body.note ?? null, action, followActionMatch.params.id, context.workspaceId]);
        return rows[0] ? json(200, rows[0], requestId) : json(404, { code: "NOT_FOUND", message: "Follow task not found." }, requestId);
      }
      const current = await this.runtime.calendarApi.getEvent(context.workspaceId, followActionMatch.params.id);
      if (!current || current.kind !== "follow_up") return json(404, { code: "NOT_FOUND", message: "Follow task not found." }, requestId);
      const updated = await this.runtime.calendarApi.updateEvent(context.workspaceId, current.id, {
        status: action === "complete" ? "done" : action === "cancel" ? "cancelled" : "pending",
        ...(action === "delay" ? { start: new Date(body.dueAt!).toISOString(), end: new Date(Date.parse(body.dueAt!) + 30 * 60 * 1000).toISOString() } : {}),
        note: body.note ? `${current.note ? `${current.note}\n` : ""}${body.note}` : current.note,
      });
      await this.runtime.persist();
      return json(200, updated, requestId);
    }

    const followTaskMatch = matchPath("/follow-tasks/:id", pathname);
    if (followTaskMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      if (this.runtime.driver === "postgres") {
        const rows = await pgQuery(`select * from follow_tasks where id = $1 and workspace_id = $2`, [followTaskMatch.params.id, context.workspaceId]);
        return rows[0] ? json(200, rows[0], requestId) : json(404, { code: "NOT_FOUND", message: "Follow task not found." }, requestId);
      }
      const item = await this.runtime.calendarApi.getEvent(context.workspaceId, followTaskMatch.params.id);
      return item ? json(200, item, requestId) : json(404, { code: "NOT_FOUND", message: "Follow task not found." }, requestId);
    }
    if (followTaskMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const body = await readJsonBody<{ title?: string; dueAt?: string; priority?: "low" | "medium" | "high"; assigneeUserId?: string | null; note?: string | null }>(request);
      if (body.dueAt && Number.isNaN(Date.parse(body.dueAt))) return json(400, { code: "VALIDATION_ERROR", message: "Invalid dueAt." }, requestId);
      if (body.assigneeUserId) {
        const members = await this.runtime.authApi.listWorkspaceMembers(context);
        if (!members.some((member) => member.userId === body.assigneeUserId)) {
          return json(400, { code: "VALIDATION_ERROR", message: "assigneeUserId is not a member of this workspace." }, requestId);
        }
      }
      if (this.runtime.driver === "postgres") {
        const rows = await pgQuery(`update follow_tasks set title = coalesce($1,title), due_at = coalesce($2::timestamptz,due_at),
          priority = coalesce($3,priority), assignee_user_id = case when $4::boolean then $5 else assignee_user_id end,
          note = case when $6::boolean then $7 else note end, updated_at = now()
          where id = $8 and workspace_id = $9 returning *`, [body.title ?? null, body.dueAt ?? null, body.priority ?? null, Object.hasOwn(body, "assigneeUserId"), body.assigneeUserId ?? null, Object.hasOwn(body, "note"), body.note ?? null, followTaskMatch.params.id, context.workspaceId]);
        return rows[0] ? json(200, rows[0], requestId) : json(404, { code: "NOT_FOUND", message: "Follow task not found." }, requestId);
      }
      const updated = await this.runtime.calendarApi.updateEvent(context.workspaceId, followTaskMatch.params.id, { title: body.title, start: body.dueAt, note: body.note ?? undefined });
      return updated ? json(200, updated, requestId) : json(404, { code: "NOT_FOUND" }, requestId);
    }

    const inquiryFollowUpsMatch = matchPath("/inquiries/:id/follow-up-records", pathname);
    if (inquiryFollowUpsMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      if (this.runtime.driver === "postgres") {
        const rows = await pgQuery(`select * from follow_up_records where workspace_id = $1 and inquiry_id = $2 order by occurred_at desc`, [context.workspaceId, inquiryFollowUpsMatch.params.id]);
        return json(200, rows, requestId);
      }
      const events = await this.runtime.calendarApi.listEvents(context.workspaceId);
      return json(200, events.filter((event) => event.kind === "follow_up" && event.leadId === inquiryFollowUpsMatch.params.id), requestId);
    }
    if (inquiryFollowUpsMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const body = await readJsonBody<{ title?: string; note?: string; occurredAt?: string; ownerName?: string }>(request);
      const start = new Date(body.occurredAt ?? Date.now());
      if (Number.isNaN(start.getTime())) return json(400, { code: "VALIDATION_ERROR", message: "Invalid occurredAt." }, requestId);
      if (this.runtime.driver === "postgres") {
        const id = `fur_${randomUUID()}`;
        await pgQuery(`insert into follow_up_records (id, workspace_id, inquiry_id, actor_user_id, contact_method, content, result, occurred_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, context.workspaceId, inquiryFollowUpsMatch.params.id, context.userId, "other", body.note ?? body.title ?? "客户跟进", body.title ?? null, start.toISOString()]);
        return json(201, { id, inquiryId: inquiryFollowUpsMatch.params.id, content: body.note ?? body.title ?? "客户跟进", occurredAt: start.toISOString() }, requestId);
      }
      const created = await this.runtime.calendarApi.createEvent(context.workspaceId, {
        title: body.title?.trim() || "客户跟进记录", start: start.toISOString(), end: start.toISOString(),
        kind: "follow_up", status: "done", leadId: inquiryFollowUpsMatch.params.id,
        ownerName: body.ownerName, note: body.note,
      });
      await this.runtime.persist();
      return json(201, created, requestId);
    }

    if (pathname === "/calendar/events" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const url = new URL(request.url);
      const from = url.searchParams.get("from") ?? undefined;
      const to = url.searchParams.get("to") ?? undefined;
      return json(
        200,
        { events: await this.runtime.calendarApi.listEvents(context.workspaceId, from, to) },
        requestId,
      );
    }

    if (pathname === "/calendar/events" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const body = await readJsonBody<{
        title?: string;
        start?: string;
        end?: string;
        kind?: "follow_up" | "demo" | "meeting" | "call" | "reminder";
        status?: "pending" | "done" | "cancelled";
        leadId?: string;
        leadName?: string;
        ownerName?: string;
        note?: string;
      }>(request);

      if (!body.title || !body.start || !body.end || !body.kind) {
        return json(
          400,
          { code: "BAD_REQUEST", message: "缺少 title / start / end / kind。" },
          requestId,
        );
      }

      const created = await this.runtime.calendarApi.createEvent(context.workspaceId, {
        title: body.title,
        start: body.start,
        end: body.end,
        kind: body.kind,
        status: body.status ?? "pending",
        leadId: body.leadId,
        leadName: body.leadName,
        ownerName: body.ownerName,
        note: body.note,
      });
      await this.runtime.persist();
      return json(201, created, requestId);
    }

    const eventMatch = matchPath("/calendar/events/:id", pathname);

    if (eventMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const event = await this.runtime.calendarApi.getEvent(
        context.workspaceId,
        eventMatch.params.id,
      );
      if (!event) {
        return json(404, { code: "NOT_FOUND", message: "事件不存在。" }, requestId);
      }
      return json(200, event, requestId);
    }

    if (eventMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const patch = await readJsonBody<{
        title?: string;
        start?: string;
        end?: string;
        kind?: "follow_up" | "demo" | "meeting" | "call" | "reminder";
        status?: "pending" | "done" | "cancelled";
        leadId?: string;
        leadName?: string;
        ownerName?: string;
        note?: string;
      }>(request);
      const updated = await this.runtime.calendarApi.updateEvent(
        context.workspaceId,
        eventMatch.params.id,
        patch,
      );
      if (!updated) {
        return json(404, { code: "NOT_FOUND", message: "事件不存在。" }, requestId);
      }
      await this.runtime.persist();
      return json(200, updated, requestId);
    }

    if (eventMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      assertWriteRole(context.role);
      const removed = await this.runtime.calendarApi.deleteEvent(
        context.workspaceId,
        eventMatch.params.id,
      );
      if (!removed) {
        return json(404, { code: "NOT_FOUND", message: "事件不存在。" }, requestId);
      }
      await this.runtime.persist();
      return json(200, { ok: true }, requestId);
    }

    return null;
  }
}
