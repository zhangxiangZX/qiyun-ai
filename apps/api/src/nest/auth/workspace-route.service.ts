import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { buildRateLimitMessage, checkNamedRateLimit } from "../../http/rate-limit";
import type { RateLimitPolicyName } from "../../http/rate-limit";
import { getClientIp } from "../../http/request-context";
import { NestAuthContextService } from "./auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { NotificationValidationError } from "../../notifications/notification.service";
import { runWithBypassRls } from "../../db/tenant-context";
import type { WorkspaceProfilePatch } from "../../auth/auth.types";
import { query as pgQuery } from "../../db/pg";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["workspace.manage", "members.manage", "inquiries.all", "quotes.manage", "reports.export", "settings.manage"],
  admin: ["members.manage", "inquiries.all", "quotes.manage", "reports.export", "settings.manage"],
  member: ["inquiries.self", "quotes.self", "follow_tasks.self", "quick_entry.create"],
  viewer: ["dashboard.read", "reports.read"],
};

const checkRate = (request: Request, key: RateLimitPolicyName) => {
  if (process.env.NODE_ENV !== "test") {
    const ip = getClientIp(request);
    const rate = checkNamedRateLimit(key, ip);
    if (!rate.allowed) return fail(ApiCode.RATE_LIMITED, buildRateLimitMessage(key, rate.retryAfterSec), 429);
  }
  return null;
};

@Injectable()
export class WorkspaceRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/roles" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      let stored: Array<{ role: string; permissions: string[] }> = [];
      if (this.runtime.driver === "postgres") {
        const rows = await pgQuery(`select role, permissions from role_permissions where workspace_id = $1`, [ctx.workspaceId]);
        stored = rows.map((row) => ({ role: String(row.role), permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : [] }));
      }
      return ok(Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, defaults]) => ({ role, permissions: stored.find((item) => item.role === role)?.permissions ?? defaults })));
    }

    const rolePermissionsMatch = matchPath("/roles/:role/permissions", pathname);
    if (rolePermissionsMatch && (method === "GET" || method === "PATCH")) {
      const ctx = await this.authContext.resolve(request.headers);
      const role = rolePermissionsMatch.params.role;
      if (!(role in DEFAULT_ROLE_PERMISSIONS)) return fail(ApiCode.NOT_FOUND, "Role not found.", 404);
      if (method === "PATCH") {
        if (ctx.role !== "owner" && ctx.role !== "admin") return fail(ApiCode.FORBIDDEN_SCOPE, "Manager access required.", 403);
        const body = await readJsonBody<{ permissions?: string[] }>(request);
        const permissions = [...new Set((body.permissions ?? []).filter((item) => typeof item === "string" && item.length <= 100))];
        if (this.runtime.driver === "postgres") {
          await pgQuery(`insert into role_permissions (workspace_id, role, permissions, updated_by) values ($1,$2,$3::jsonb,$4)
            on conflict (workspace_id, role) do update set permissions = excluded.permissions, updated_by = excluded.updated_by, updated_at = now()`,
          [ctx.workspaceId, role, JSON.stringify(permissions), ctx.userId]);
        }
        return ok({ role, permissions });
      }
      if (this.runtime.driver === "postgres") {
        const rows = await pgQuery(`select permissions from role_permissions where workspace_id = $1 and role = $2`, [ctx.workspaceId, role]);
        if (rows[0]) return ok({ role, permissions: rows[0].permissions });
      }
      return ok({ role, permissions: DEFAULT_ROLE_PERMISSIONS[role] });
    }

    if (pathname === "/notifications" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.notificationService.getFeed(ctx));
    }
    if (pathname === "/notifications/read" && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ ids?: string[]; all?: boolean }>(request);
      try {
        return ok(await this.runtime.notificationService.markRead(ctx, body));
      } catch (error) {
        if (error instanceof NotificationValidationError) return fail(ApiCode.VALIDATION, error.message, 400);
        throw error;
      }
    }

    if (pathname === "/workspaces" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      // 列出用户所属的全部工作空间（跨租户），无法用单一上下文限定，需旁路。
      return runWithBypassRls(() => this.runtime.authApi.listWorkspaces(ctx).then(ok));
    }
    if (pathname === "/workspaces/current" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.authApi.getCurrentWorkspace(ctx));
    }

    const workspaceDetailMatch = matchPath("/workspaces/:id", pathname);
    if (workspaceDetailMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      if (ctx.workspaceId !== workspaceDetailMatch.params.id) {
        return fail(ApiCode.UNAUTHORIZED, "Active workspace must match the requested workspace.", 401);
      }
      const workspace = await this.runtime.authApi.getWorkspaceById(
        ctx.userId,
        workspaceDetailMatch.params.id,
      );
      return ok(workspace);
    }
    if (workspaceDetailMatch && method === "PATCH") {
      const ctx = await this.authContext.resolve(request.headers);
      if (ctx.workspaceId !== workspaceDetailMatch.params.id) {
        return fail(ApiCode.UNAUTHORIZED, "Active workspace must match the target workspace.", 401);
      }
      const body = await readJsonBody<WorkspaceProfilePatch>(request);
      const updated = await this.runtime.authApi.updateWorkspace(
        ctx.userId,
        workspaceDetailMatch.params.id,
        body,
      );
      await this.runtime.persist();
      return ok(updated);
    }

    const activateMatch = matchPath("/workspaces/:id/activate", pathname);
    if (activateMatch && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      const result = await this.runtime.authApi.activateWorkspace(ctx, activateMatch.params.id);
      await this.runtime.persist();
      return ok(result);
    }

    const transferOwnerMatch = matchPath("/workspaces/:id/transfer-owner", pathname);
    if (transferOwnerMatch && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ targetUserId?: string }>(request);
      if (ctx.workspaceId !== transferOwnerMatch.params.id) {
        return fail(ApiCode.UNAUTHORIZED, "Active workspace must match transfer target.", 401);
      }
      const result = await this.runtime.authApi.transferWorkspaceOwnership(ctx, body.targetUserId ?? "");
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/workspace-members" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.authApi.listWorkspaceMembers(ctx));
    }

    const memberMatch = matchPath("/workspace-members/:userId", pathname);
    if (memberMatch && method === "PATCH") {
      const ctx = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{
        role?: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin";
        status?: "active" | "disabled";
      }>(request);
      if (!body.role && !body.status) {
        return fail(ApiCode.VALIDATION, "Provide role or status to update.", 400);
      }
      if (body.status && !["active", "disabled"].includes(body.status)) {
        return fail(ApiCode.VALIDATION, "Unsupported member status.", 400);
      }
      const updated = await this.runtime.authApi.updateWorkspaceMemberRole(ctx, memberMatch.params.userId, body);
      await this.runtime.persist();
      return ok(updated);
    }
    if (memberMatch && method === "DELETE") {
      const ctx = await this.authContext.resolve(request.headers);
      const removed = await this.runtime.authApi.removeWorkspaceMember(ctx, memberMatch.params.userId);
      await this.runtime.persist();
      return ok(removed);
    }

    if (pathname === "/workspace-invitations" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.authApi.listWorkspaceInvitations(ctx));
    }

    const invitationAuditsMatch = matchPath("/workspace-invitations/:id/delivery-audits", pathname);
    if (invitationAuditsMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.authApi.listWorkspaceInvitationDeliveryAudits(ctx, invitationAuditsMatch.params.id));
    }

    if (pathname === "/workspace-invitations" && method === "POST") {
      const rate = checkRate(request, "workspace.invite");
      if (rate) return rate;
      const ctx = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ email?: string; role?: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin" }>(request);
      const created = await this.runtime.authApi.inviteWorkspaceMember(ctx, body);
      await this.runtime.persist();
      return ok(created);
    }

    if (pathname === "/settings/account" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.authApi.getAccountSettings(ctx));
    }
    if (pathname === "/settings/account" && method === "PATCH") {
      const ctx = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{
        nickname?: string;
        phone?: string;
        email?: string;
        jobTitle?: string;
        bio?: string;
        department?: string;
        notificationPrefs?: {
          system?: boolean;
          leads?: boolean;
          quoteStatus?: boolean;
          marketing?: boolean;
        };
        language?: "zh" | "en";
      }>(request);
      const updated = await this.runtime.authApi.updateAccountSettings(ctx, body);
      await this.runtime.persist();
      return ok(updated);
    }

    const invitationAcceptMatch = matchPath("/workspace-invitations/:id/accept", pathname);
    if (invitationAcceptMatch && method === "POST") {
      const rate = checkRate(request, "workspace.invitation.accept");
      if (rate) return rate;
      const ctx = await this.authContext.resolve(request.headers);
      // 接受邀请会为「被邀请的工作空间」写入成员关系（≠当前上下文），需旁路。
      const accepted = await runWithBypassRls(async () => {
        const a = await this.runtime.authApi.acceptWorkspaceInvitation(ctx, invitationAcceptMatch.params.id);
        await this.runtime.persist();
        return a;
      });
      return ok(accepted);
    }

    const invitationRevokeMatch = matchPath("/workspace-invitations/:id/revoke", pathname);
    if (invitationRevokeMatch && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      const revoked = await this.runtime.authApi.revokeWorkspaceInvitation(ctx, invitationRevokeMatch.params.id);
      await this.runtime.persist();
      return ok(revoked);
    }

    const invitationResendMatch = matchPath("/workspace-invitations/:id/resend", pathname);
    if (invitationResendMatch && method === "POST") {
      const rate = checkRate(request, "workspace.invitation.resend");
      if (rate) return rate;
      const ctx = await this.authContext.resolve(request.headers);
      const resent = await this.runtime.authApi.resendWorkspaceInvitation(ctx, invitationResendMatch.params.id);
      await this.runtime.persist();
      return ok(resent);
    }

    return null;
  }
}
