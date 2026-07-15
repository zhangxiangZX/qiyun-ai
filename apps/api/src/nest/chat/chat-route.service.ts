import { Inject, Injectable } from "@nestjs/common";

import { writeWorkspaceAudit } from "../../audit/audit-write";
import { createChatSseStreamFromAsync } from "../../chat/chat.sse";
import type { LeadAttachmentUpload } from "../../chat/chat.types";
import { parseConversationListQuery } from "../../chat/conversation-list-query";
import type { ApiRuntime } from "../../runtime";
import { matchPath, stream, type ApiResult } from "../../http/api-result";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { buildRateLimitMessage, checkNamedRateLimit } from "../../http/rate-limit";
import { getClientIp } from "../../http/request-context";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthAccessError } from "../../auth/auth.api";
import { runWithBypassRls } from "../../db/tenant-context";
import type { WorkspaceMemberRole } from "../../auth/auth.types";

function assertRoleAllowed(role: WorkspaceMemberRole, allowed: WorkspaceMemberRole[], message: string): void {
  if (!allowed.includes(role)) throw new AuthAccessError(message);
}

async function* prependFirstEvent<T>(first: T, iterator: AsyncIterator<T>): AsyncGenerator<T> {
  yield first;
  while (true) { const next = await iterator.next(); if (next.done) return; yield next.value; }
}

function trustedOrigin(request: Request, fallback?: string): string {
  const headerOrigin = request.headers.get("origin");
  if (headerOrigin) return headerOrigin;
  const referer = request.headers.get("referer");
  if (referer) { try { return new URL(referer).origin; } catch { /* ignore */ } }
  return fallback ?? "";
}

async function readLeadSubmissionBody(request: Request): Promise<{
  botId: string; siteKey: string; conversationId: string; fields: Record<string, string>; attachments: LeadAttachmentUpload[]; pendingAttachmentIds: string[];
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const body = await readJsonBody<{ botId: string; siteKey: string; conversationId: string; fields: Record<string, string>; pendingAttachmentIds?: string[] }>(request);
    return {
      botId: body.botId,
      siteKey: body.siteKey,
      conversationId: body.conversationId,
      fields: body.fields ?? {},
      attachments: [],
      pendingAttachmentIds: Array.isArray(body.pendingAttachmentIds) ? body.pendingAttachmentIds.map(String) : [],
    };
  }
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  const attachments: LeadAttachmentUpload[] = [];
  const pendingAttachmentIds: string[] = [];
  const fieldsJson = formData.get("fields");
  if (typeof fieldsJson === "string" && fieldsJson.trim()) {
    try { const parsed = JSON.parse(fieldsJson) as Record<string, unknown>; for (const [key, value] of Object.entries(parsed)) fields[key] = String(value ?? ""); } catch { /* fallback */ }
  }
  const pendingJson = formData.get("pendingAttachmentIds");
  if (typeof pendingJson === "string" && pendingJson.trim()) {
    try {
      const parsed = JSON.parse(pendingJson);
      if (Array.isArray(parsed)) pendingAttachmentIds.push(...parsed.map(String));
    } catch { /* fallback */ }
  }
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      attachments.push({ fileName: value.name, fileType: value.type || "application/octet-stream", sizeBytes: value.size, contentBytes: new Uint8Array(await value.arrayBuffer()) });
      continue;
    }
    if (key === "pendingAttachmentId" && typeof value === "string") {
      pendingAttachmentIds.push(value);
      continue;
    }
    if (key === "botId" || key === "siteKey" || key === "conversationId" || key === "fields" || key === "pendingAttachmentIds") continue;
    if (!(key in fields)) fields[key] = String(value);
  }
  return {
    botId: String(formData.get("botId") ?? ""),
    siteKey: String(formData.get("siteKey") ?? ""),
    conversationId: String(formData.get("conversationId") ?? ""),
    fields,
    attachments,
    pendingAttachmentIds,
  };
}

@Injectable()
export class ChatRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/conversations" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const url = new URL(request.url);
      const listQuery = parseConversationListQuery(url.searchParams);
      const result = await this.runtime.publicChatApi.listConversations(context, listQuery);
      return ok(listQuery ? result : result.items);
    }

    const conversationMatch = matchPath("/conversations/:id", pathname);
    if (conversationMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.publicChatApi.getConversation(context, conversationMatch.params.id));
    }
    if (conversationMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin", "member"], "Lead and conversation write access is required.");
      const body = await readJsonBody<{ status?: "open" | "resolved" | "unresolved" | "pending"; tags?: string[]; assignee?: string | null }>(request);
      const updated = await this.runtime.publicChatApi.updateConversation(context, conversationMatch.params.id, body);
      await this.runtime.persist();
      return ok(updated);
    }

    if (pathname === "/leads" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.publicChatApi.listLeads(context));
    }
    if (pathname === "/leads" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin", "member"], "Lead write access is required.");
      const body = await readJsonBody<{ name?: string; contact?: string; sourceBot?: string; lastQuestion?: string }>(request);
      if (!body.name?.trim()) return fail(ApiCode.VALIDATION, "name is required.", 400);
      const created = await this.runtime.publicChatApi.createLead(context, { name: body.name.trim(), contact: body.contact?.trim() || undefined, sourceBot: body.sourceBot?.trim() || undefined, lastQuestion: body.lastQuestion?.trim() || undefined });
      await this.runtime.persist();
      return ok(created);
    }

    const leadMatch = matchPath("/leads/:id", pathname);
    if (leadMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.publicChatApi.getLead(context, leadMatch.params.id));
    }
    const leadAttachmentMatch = matchPath("/leads/:id/attachments/:attachmentId", pathname);
    if (leadAttachmentMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const file = await this.runtime.publicChatApi.readLeadAttachment(context, leadAttachmentMatch.params.id, leadAttachmentMatch.params.attachmentId);
      return { status: 200, headers: { "content-type": file.attachment.fileType || "application/octet-stream", "content-disposition": `attachment; filename="${encodeURIComponent(file.attachment.fileName)}"` }, bytes: file.contentBytes };
    }
    if (leadMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin", "member"], "Lead and conversation write access is required.");
      const body = await readJsonBody<{ status?: "new" | "pending" | "contacted" | "proposal" | "won" | "invalid"; assignee?: string | null; notes?: string }>(request);
      const normalizedStatus = (body.status as string) === "following" ? "pending" : body.status;
      const updated = await this.runtime.publicChatApi.updateLead(context, leadMatch.params.id, { ...body, status: normalizedStatus });
      await this.runtime.persist();
      return ok(updated);
    }

    if (pathname === "/sites" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.publicChatApi.listSites(context));
    }
    if (pathname === "/sites" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin"], "Workspace manager access is required.");
      const body = await readJsonBody<{ botId?: string; name?: string; allowedDomains?: string[]; status?: "active" | "disabled" }>(request);
      const created = await this.runtime.chatService.createSite({ workspaceId: context.workspaceId, botId: body.botId ?? "", name: body.name ?? "Primary Site", allowedDomains: body.allowedDomains ?? ["localhost"], status: body.status, actorUserId: context.userId });
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "site",
        action: "create",
        targetId: created.site.id,
        detail: { name: created.site.name, botId: created.site.botId },
      });
      await this.runtime.persist();
      return ok(created);
    }

    const siteMatch = matchPath("/sites/:id", pathname);
    if (siteMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin"], "Workspace manager access is required.");
      const body = await readJsonBody<{ allowedDomains?: string[]; name?: string; status?: "active" | "disabled" }>(request);
      const updated = await this.runtime.publicChatApi.updateSite(context, siteMatch.params.id, body);
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "site",
        action: "update",
        targetId: siteMatch.params.id,
        detail: body,
      });
      await this.runtime.persist();
      return ok(updated);
    }
    if (siteMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin"], "Workspace manager access is required.");
      const deleted = await this.runtime.publicChatApi.deleteSite(context, siteMatch.params.id);
      if (!deleted) return fail(ApiCode.NOT_FOUND, "Site not found.", 404);
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "site",
        action: "delete",
        targetId: siteMatch.params.id,
      });
      await this.runtime.persist();
      return ok({ deleted: true });
    }

    const rotateKeyMatch = matchPath("/sites/:id/rotate-key", pathname);
    if (rotateKeyMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin"], "Workspace manager access is required.");
      const rotated = await this.runtime.publicChatApi.rotateSiteKey(context, rotateKeyMatch.params.id);
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "site",
        action: "rotate_key",
        targetId: rotateKeyMatch.params.id,
        detail: { tokenPrefix: rotated.site.siteKeyPrefix },
      });
      await this.runtime.persist();
      return ok(rotated);
    }

    const siteTestMatch = matchPath("/sites/:id/test-message", pathname);
    if (siteTestMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertRoleAllowed(context.role, ["owner", "admin"], "Workspace manager access is required.");
      if (process.env.NODE_ENV !== "test") {
        const rate = checkNamedRateLimit("sites.test-message", `${context.userId}:${siteTestMatch.params.id}`);
        if (!rate.allowed) return fail(ApiCode.RATE_LIMITED, buildRateLimitMessage("sites.test-message", rate.retryAfterSec), 429);
      }
      const body = await readJsonBody<{ origin?: string; message?: string }>(request);
      const result = await this.runtime.publicChatApi.testSiteMessage(context, siteTestMatch.params.id, { origin: body.origin ?? "", message: body.message ?? "" });
      return ok(result);
    }

    const siteInstallMatch = matchPath("/sites/:id/check-install", pathname);
    if (siteInstallMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.publicChatApi.checkSiteInstall(context, siteInstallMatch.params.id));
    }

    if (pathname === "/public/widget/config" && method === "GET") {
      const url = new URL(request.url);
      const botId = url.searchParams.get("botId") ?? "";
      const siteKey = url.searchParams.get("siteKey") ?? "";
      const origin = trustedOrigin(request, url.searchParams.get("origin") ?? "");
      if (!botId || !siteKey || !origin) return fail(ApiCode.VALIDATION, "botId, siteKey, and origin are required.", 400);
      return ok(await this.runtime.publicChatApi.getPublicWidgetConfig({ botId, siteKey, origin }));
    }

    if (pathname === "/public/chat/stream" && method === "POST") {
      const body = await readJsonBody<{ botId: string; siteKey: string; visitorId: string; conversationId?: string; sdkVersion: string; origin: string; message: string }>(request);
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("public.chat.ip", ip);
        if (!rate.allowed) return fail(ApiCode.RATE_LIMITED, buildRateLimitMessage("public.chat.ip", rate.retryAfterSec), 429);
      }
      if (!body.botId || !body.siteKey || !body.origin || !body.message) return fail(ApiCode.VALIDATION, "botId, siteKey, origin, and message are required.", 400);
      const origin = trustedOrigin(request, body.origin ?? "");
      const iterator = this.runtime.publicChatApi.streamLive({ ...body, origin })[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (first.done) {
        return stream(200, createChatSseStreamFromAsync((async function* () {})(), async () => { await this.runtime.persist(); }), "text/event-stream; charset=utf-8");
      }
      return stream(200, createChatSseStreamFromAsync(prependFirstEvent(first.value, iterator), async () => { await this.runtime.persist(); }), "text/event-stream; charset=utf-8");
    }

    if (pathname === "/public/leads" && method === "POST") {
      const body = await readLeadSubmissionBody(request);
      if (process.env.NODE_ENV !== "test") {
        const rate = checkNamedRateLimit("public.leads.ip", getClientIp(request));
        if (!rate.allowed) return fail(ApiCode.RATE_LIMITED, buildRateLimitMessage("public.leads.ip", rate.retryAfterSec), 429);
      }
      if (!body.botId || !body.siteKey) return fail(ApiCode.VALIDATION, "botId and siteKey are required.", 400);
      const origin = trustedOrigin(request, "");
      const created = await this.runtime.publicChatApi.submitLead({ ...body, origin });
      await this.runtime.persist();
      return ok(created);
    }

    if (pathname === "/public/leads/attachments" && method === "POST") {
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
      const botId = String(form.get("botId") ?? "");
      const siteKey = String(form.get("siteKey") ?? "");
      if (!botId || !siteKey) {
        return fail(ApiCode.VALIDATION, "botId 和 siteKey 为必填。", 400);
      }
      if (process.env.NODE_ENV !== "test") {
        const rate = checkNamedRateLimit("public.leads.attachments.ip", getClientIp(request));
        if (!rate.allowed) return fail(ApiCode.RATE_LIMITED, buildRateLimitMessage("public.leads.attachments.ip", rate.retryAfterSec), 429);
      }
      const contentBytes = new Uint8Array(await file.arrayBuffer());
      const ref = await this.runtime.publicChatApi.uploadPendingLeadAttachment({
        botId,
        siteKey,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        contentBytes,
      });
      await this.runtime.persist();
      return ok(ref);
    }

    const pendingAttachmentMatch = matchPath("/public/leads/attachments/:id", pathname);
    if (pendingAttachmentMatch && method === "GET") {
      try {
        // 公开读路径：以附件 id（秘密令牌）为授权，RLS 下需旁路。
        const file = await runWithBypassRls(() =>
          this.runtime.publicChatApi.readPendingLeadAttachmentPublic(pendingAttachmentMatch.params.id),
        );
        return {
          status: 200,
          headers: {
            "content-type": file.attachment.fileType || "application/octet-stream",
            "content-disposition": `attachment; filename="${encodeURIComponent(file.attachment.fileName)}"`,
          },
          bytes: file.contentBytes,
        };
      } catch {
        return fail(ApiCode.NOT_FOUND, "Attachment not found or expired.", 404);
      }
    }

    return null;
  }
}
