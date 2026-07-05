import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { json, matchPath, type ApiResult } from "../../http/api-result";
import { readJsonBody } from "../../http/request-body";
import {
  buildRateLimitMessage,
  checkNamedRateLimit,
} from "../../http/rate-limit";
import { getClientIp } from "../../http/request-context";
import { NestAuthContextService } from "./auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { NotificationValidationError } from "../../notifications/notification.service";

@Injectable()
export class WorkspaceRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/notifications" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const feed = await this.runtime.notificationService.getFeed(context);
      return json(200, feed);
    }

    if (pathname === "/notifications/read" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ ids?: string[]; all?: boolean }>(request);
      try {
        const result = await this.runtime.notificationService.markRead(context, body);
        return json(200, result);
      } catch (error) {
        if (error instanceof NotificationValidationError) {
          return json(400, { code: "INVALID_BODY", message: error.message });
        }
        throw error;
      }
    }

    if (pathname === "/workspaces" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return json(200, await this.runtime.authApi.listWorkspaces(context));
    }

    if (pathname === "/workspaces/current" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return json(200, await this.runtime.authApi.getCurrentWorkspace(context));
    }

    const activateMatch = matchPath("/workspaces/:id/activate", pathname);
    if (activateMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const result = await this.runtime.authApi.activateWorkspace(
        context,
        activateMatch.params.id,
      );
      await this.runtime.persist();
      return json(200, result);
    }

    const transferOwnerMatch = matchPath("/workspaces/:id/transfer-owner", pathname);
    if (transferOwnerMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ targetUserId?: string }>(request);
      if (context.workspaceId !== transferOwnerMatch.params.id) {
        return json(401, {
          code: "UNAUTHORIZED",
          message: "Active workspace must match transfer target.",
        });
      }
      const result = await this.runtime.authApi.transferWorkspaceOwnership(
        context,
        body.targetUserId ?? "",
      );
      await this.runtime.persist();
      return json(200, result);
    }

    if (pathname === "/workspace-members" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return json(200, await this.runtime.authApi.listWorkspaceMembers(context));
    }

    const memberMatch = matchPath("/workspace-members/:userId", pathname);
    if (memberMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{
        role?: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin";
      }>(request);
      const updated = await this.runtime.authApi.updateWorkspaceMemberRole(
        context,
        memberMatch.params.userId,
        body,
      );
      await this.runtime.persist();
      return json(200, updated);
    }
    if (memberMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      const removed = await this.runtime.authApi.removeWorkspaceMember(
        context,
        memberMatch.params.userId,
      );
      await this.runtime.persist();
      return json(200, removed);
    }

    if (pathname === "/workspace-invitations" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return json(200, await this.runtime.authApi.listWorkspaceInvitations(context));
    }

    const invitationAuditsMatch = matchPath(
      "/workspace-invitations/:id/delivery-audits",
      pathname,
    );
    if (invitationAuditsMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return json(
        200,
        await this.runtime.authApi.listWorkspaceInvitationDeliveryAudits(
          context,
          invitationAuditsMatch.params.id,
        ),
      );
    }

    if (pathname === "/workspace-invitations" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("workspace.invite", ip);
        if (!rate.allowed) {
          return json(429, {
            code: "RATE_LIMITED",
            message: buildRateLimitMessage("workspace.invite", rate.retryAfterSec),
          });
        }
      }

      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{
        email?: string;
        role?: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin";
      }>(request);
      const created = await this.runtime.authApi.inviteWorkspaceMember(context, body);
      await this.runtime.persist();
      return json(201, created);
    }

    const invitationAcceptMatch = matchPath("/workspace-invitations/:id/accept", pathname);
    if (invitationAcceptMatch && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("workspace.invitation.accept", ip);
        if (!rate.allowed) {
          return json(429, {
            code: "RATE_LIMITED",
            message: buildRateLimitMessage(
              "workspace.invitation.accept",
              rate.retryAfterSec,
            ),
          });
        }
      }

      const context = await this.authContext.resolve(request.headers);
      const accepted = await this.runtime.authApi.acceptWorkspaceInvitation(
        context,
        invitationAcceptMatch.params.id,
      );
      await this.runtime.persist();
      return json(200, accepted);
    }

    const invitationRevokeMatch = matchPath("/workspace-invitations/:id/revoke", pathname);
    if (invitationRevokeMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const revoked = await this.runtime.authApi.revokeWorkspaceInvitation(
        context,
        invitationRevokeMatch.params.id,
      );
      await this.runtime.persist();
      return json(200, revoked);
    }

    const invitationResendMatch = matchPath("/workspace-invitations/:id/resend", pathname);
    if (invitationResendMatch && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("workspace.invitation.resend", ip);
        if (!rate.allowed) {
          return json(429, {
            code: "RATE_LIMITED",
            message: buildRateLimitMessage(
              "workspace.invitation.resend",
              rate.retryAfterSec,
            ),
          });
        }
      }

      const context = await this.authContext.resolve(request.headers);
      const resent = await this.runtime.authApi.resendWorkspaceInvitation(
        context,
        invitationResendMatch.params.id,
      );
      await this.runtime.persist();
      return json(200, resent);
    }

    return null;
  }
}
