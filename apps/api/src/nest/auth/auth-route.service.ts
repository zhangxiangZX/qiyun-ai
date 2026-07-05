import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { json, matchPath, type ApiResult } from "../../http/api-result";
import { readJsonBody } from "../../http/request-body";
import {
  buildRateLimitMessage,
  checkNamedRateLimit,
} from "../../http/rate-limit";
import { getClientIp } from "../../http/request-context";
import { getBearerToken } from "../../auth/auth.context";
import { NestAuthContextService } from "./auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

@Injectable()
export class AuthRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string, requestId?: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/auth/register" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.register", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.register", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{
        email?: string;
        password?: string;
        name?: string;
        workspaceName?: string;
        invitationToken?: string;
      }>(request);
      const result = await this.runtime.authApi.register(body);
      await this.runtime.persist();
      return json(201, result, requestId);
    }

    if (pathname === "/auth/login" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.login", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.login", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{ email?: string; password?: string }>(request);
      const result = await this.runtime.authApi.login(body);
      await this.runtime.persist();
      return json(200, result);
    }

    if (pathname === "/auth/me" && method === "GET") {
      const token = getBearerToken(request.headers);
      if (!token) {
        return json(
          401,
          { code: "UNAUTHORIZED", message: "Missing bearer token." },
          requestId,
        );
      }

      try {
        const user = await this.runtime.authApi.authenticate(token);
        return json(200, { user }, requestId);
      } catch {
        return json(
          401,
          { code: "UNAUTHORIZED", message: "Invalid access token." },
          requestId,
        );
      }
    }

    if (pathname === "/auth/code/request" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.code.request", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.code.request", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{ email?: string }>(request);
      const result = await this.runtime.authApi.requestEmailLoginCode(body);
      await this.runtime.persist();
      return json(200, result, requestId);
    }

    if (pathname === "/auth/password-reset/request" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.password-reset.request", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.password-reset.request", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{ email?: string }>(request);
      const result = await this.runtime.authApi.requestPasswordResetCode(body);
      await this.runtime.persist();
      return json(200, result, requestId);
    }

    if (pathname === "/trial-requests" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.trial.request", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.trial.request", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{
        companyName?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        website?: string;
        requirement?: string;
      }>(request);
      const result = await this.runtime.authApi.submitTrialRequest(body);
      await this.runtime.persist();
      return json(201, result, requestId);
    }

    if (pathname === "/auth/code/verify" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.code.verify", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.code.verify", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{ email?: string; code?: string }>(request);
      const result = await this.runtime.authApi.verifyEmailLoginCode(body);
      await this.runtime.persist();
      return json(200, result, requestId);
    }

    if (pathname === "/auth/password-reset/confirm" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.password-reset.confirm", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.password-reset.confirm", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{
        email?: string;
        code?: string;
        newPassword?: string;
      }>(request);
      const result = await this.runtime.authApi.resetPasswordWithCode(body);
      await this.runtime.persist();
      return json(200, result, requestId);
    }

    if (pathname === "/auth/refresh" && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("auth.refresh", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage("auth.refresh", rate.retryAfterSec),
            },
            requestId,
          );
        }
      }

      const body = await readJsonBody<{ refreshToken?: string }>(request);
      const result = await this.runtime.authApi.refresh(body);
      await this.runtime.persist();
      return json(200, result);
    }

    const invitationLookupMatch = matchPath("/workspace-invitations/token/:token", pathname);
    if (invitationLookupMatch && method === "GET") {
      return json(
        200,
        await this.runtime.authApi.getWorkspaceInvitationByToken(invitationLookupMatch.params.token),
      );
    }

    const invitationAcceptByTokenMatch = matchPath(
      "/workspace-invitations/token/:token/accept",
      pathname,
    );
    if (invitationAcceptByTokenMatch && method === "POST") {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit("workspace.invitation.accept", ip);
        if (!rate.allowed) {
          return json(
            429,
            {
              code: "RATE_LIMITED",
              message: buildRateLimitMessage(
                "workspace.invitation.accept",
                rate.retryAfterSec,
              ),
            },
            requestId,
          );
        }
      }

      const context = await this.authContext.resolve(request.headers);
      const accepted = await this.runtime.authApi.acceptWorkspaceInvitationByToken(
        context,
        invitationAcceptByTokenMatch.params.token,
      );
      await this.runtime.persist();
      return json(200, accepted);
    }

    return null;
  }
}
