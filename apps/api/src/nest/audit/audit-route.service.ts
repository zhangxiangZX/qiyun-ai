import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import type { ApiResult } from "../../http/api-result";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import type { WorkspaceMemberRole } from "../../auth/auth.types";

function assertAdminRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Workspace admin access is required.");
  }
}

@Injectable()
export class AuditRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;
    try {
      if (pathname === "/audit-logs" && method === "GET") {
        const context = await this.authContext.resolve(request.headers);
        assertAdminRole(context.role);
        const url = new URL(request.url);
        const module = url.searchParams.get("module") ?? undefined;
        const targetId = url.searchParams.get("targetId") ?? undefined;
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const list = await this.runtime.auditApi.list(context, {
          module,
          targetId,
          limit,
          offset,
        });
        return ok(list);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("admin access")) {
        return fail(ApiCode.FORBIDDEN_TENANT, "无权访问该企业数据", 403);
      }
      return fail(ApiCode.INTERNAL, "内部错误", 500);
    }
    return null;
  }
}
