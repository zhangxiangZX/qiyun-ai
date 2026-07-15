import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { buildRateLimitMessage, checkNamedRateLimit } from "../../http/rate-limit";
import type { RateLimitPolicyName } from "../../http/rate-limit";
import { getClientIp } from "../../http/request-context";
import { getBearerToken } from "../../auth/auth.context";
import type { AuthUserPayload } from "../../auth/auth.types";
import { NestAuthContextService } from "./auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { runWithBypassRls } from "../../db/tenant-context";

@Injectable()
export class AuthRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string, _requestId?: string): Promise<ApiResult | null> {
    const method = request.method;

    const checkRate = (key: RateLimitPolicyName) => {
      if (process.env.NODE_ENV !== "test") {
        const ip = getClientIp(request);
        const rate = checkNamedRateLimit(key, ip);
        if (!rate.allowed) {
          return fail(ApiCode.RATE_LIMITED, buildRateLimitMessage(key, rate.retryAfterSec), 429);
        }
      }
      return null;
    };

    if (pathname === "/auth/register" && method === "POST") {
      const rate = checkRate("auth.register");
      if (rate) return rate;
      const body = await readJsonBody<{ email?: string; password?: string; name?: string; workspaceName?: string; invitationToken?: string }>(request);
      // 租户引导（注册即建工作空间）：尚无租户上下文，需旁路；写入行自带 workspace_id。
      const result = await runWithBypassRls(async () => {
        const r = await this.runtime.authApi.register(body);
        await this.runtime.persist();
        return r;
      });
      return ok(result);
    }

    if (pathname === "/auth/login" && method === "POST") {
      const rate = checkRate("auth.login");
      if (rate) return rate;
      const body = await readJsonBody<{ email?: string; password?: string }>(request);
      // 登录可能在首次时自动开通工作空间，同样需旁路。
      const result = await runWithBypassRls(async () => {
        const r = await this.runtime.authApi.login(body);
        await this.runtime.persist();
        return r;
      });
      return ok(result);
    }

    if (pathname === "/auth/me" && method === "GET") {
      const token = getBearerToken(request.headers);
      if (!token) return fail(ApiCode.UNAUTHORIZED, "Missing bearer token.", 401);
      try {
        const user = await this.runtime.authApi.authenticate(token);
        return ok({ user });
      } catch {
        return fail(ApiCode.UNAUTHORIZED, "Invalid access token.", 401);
      }
    }

    if (pathname === "/auth/code/request" && method === "POST") {
      const rate = checkRate("auth.code.request");
      if (rate) return rate;
      const body = await readJsonBody<{ email?: string }>(request);
      const result = await this.runtime.authApi.requestEmailLoginCode(body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/auth/password-reset/request" && method === "POST") {
      const rate = checkRate("auth.password-reset.request");
      if (rate) return rate;
      const body = await readJsonBody<{ email?: string }>(request);
      const result = await this.runtime.authApi.requestPasswordResetCode(body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/trial-requests" && method === "POST") {
      const rate = checkRate("auth.trial.request");
      if (rate) return rate;
      const body = await readJsonBody<{ companyName?: string; contactName?: string; email?: string; phone?: string; website?: string; requirement?: string; requestedPlan?: string }>(request);
      const result = await this.runtime.authApi.submitTrialRequest(body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/auth/code/verify" && method === "POST") {
      const rate = checkRate("auth.code.verify");
      if (rate) return rate;
      const body = await readJsonBody<{ email?: string; code?: string }>(request);
      const result = await this.runtime.authApi.verifyEmailLoginCode(body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/auth/password-reset/confirm" && method === "POST") {
      const rate = checkRate("auth.password-reset.confirm");
      if (rate) return rate;
      const body = await readJsonBody<{ email?: string; code?: string; newPassword?: string }>(request);
      const result = await this.runtime.authApi.resetPasswordWithCode(body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/auth/refresh" && method === "POST") {
      const rate = checkRate("auth.refresh");
      if (rate) return rate;
      const body = await readJsonBody<{ refreshToken?: string }>(request);
      const result = await this.runtime.authApi.refresh(body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/auth/change-password" && method === "POST") {
      const rate = checkRate("auth.change-password");
      if (rate) return rate;
      const token = getBearerToken(request.headers);
      if (!token) return fail(ApiCode.UNAUTHORIZED, "Missing bearer token.", 401);
      let user: AuthUserPayload;
      try {
        user = await this.runtime.authApi.authenticate(token);
      } catch {
        return fail(ApiCode.UNAUTHORIZED, "Invalid access token.", 401);
      }
      const body = await readJsonBody<{ newPassword?: string }>(request);
      const result = await this.runtime.authApi.changePassword(user.id, body);
      await this.runtime.persist();
      return ok(result);
    }

    if (pathname === "/auth/logout" && method === "POST") {
      return ok({ success: true });
    }

    if (pathname === "/auth/password/first-change" && method === "POST") {
      const rate = checkRate("auth.change-password");
      if (rate) return rate;
      const token = getBearerToken(request.headers);
      if (!token) return fail(ApiCode.UNAUTHORIZED, "Missing bearer token.", 401);
      let user: AuthUserPayload;
      try {
        user = await this.runtime.authApi.authenticate(token);
      } catch {
        return fail(ApiCode.UNAUTHORIZED, "Invalid access token.", 401);
      }
      if (!user.mustChangePassword) {
        return fail(ApiCode.BAD_REQUEST, "Password has already been changed.", 400);
      }
      const body = await readJsonBody<{ newPassword?: string }>(request);
      const result = await this.runtime.authApi.changePassword(user.id, body);
      await this.runtime.persist();
      return ok(result);
    }

    const invitationLookupMatch = matchPath("/workspace-invitations/token/:token", pathname);
    if (invitationLookupMatch && method === "GET") {
      // 公开邀请查询：以 token 为授权，RLS 下需旁路。
      return runWithBypassRls(() =>
        this.runtime.authApi.getWorkspaceInvitationByToken(invitationLookupMatch.params.token).then(ok),
      );
    }

    const invitationAcceptByTokenMatch = matchPath("/workspace-invitations/token/:token/accept", pathname);
    if (invitationAcceptByTokenMatch && method === "POST") {
      const rate = checkRate("workspace.invitation.accept");
      if (rate) return rate;
      const context = await this.authContext.resolve(request.headers);
      // 接受邀请会为「被邀请的工作空间」写入成员关系（≠当前上下文），需旁路。
      const accepted = await runWithBypassRls(async () => {
        const a = await this.runtime.authApi.acceptWorkspaceInvitationByToken(context, invitationAcceptByTokenMatch.params.token);
        await this.runtime.persist();
        return a;
      });
      return ok(accepted);
    }

    return null;
  }
}
