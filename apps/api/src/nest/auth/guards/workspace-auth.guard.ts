import { Inject, Injectable } from "@nestjs/common";

import { AuthAccessError } from "../../../auth/auth.api";
import type { AuthUserPayload } from "../../../auth/auth.types";
import type { RequestContext } from "../../../workspace";
import { enterWithTenant } from "../../../db/tenant-context";
import type { ApiRuntime } from "../../../runtime";
import { API_RUNTIME } from "../../runtime/runtime.tokens";

@Injectable()
export class WorkspaceAuthGuard {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
  ) {}

  async resolveWorkspaceContext(
    headers: Headers,
    user: AuthUserPayload,
  ): Promise<RequestContext> {
    const requestedWorkspaceId = headers.get("x-workspace-id")?.trim() || null;
    const workspaceId = requestedWorkspaceId || user.activeWorkspaceId;
    if (!workspaceId) {
      throw new AuthAccessError("No active workspace is set.");
    }

    // 必须在成员校验前注入租户上下文：成员/工作空间查询需在 RLS 作用域内按
    // workspace_id 过滤；否则在 FORCE RLS 下会因无上下文而被全部拦截。
    enterWithTenant(workspaceId);
    const workspace = await this.runtime.authApi.assertWorkspaceAccess(user.id, workspaceId);

    return {
      userId: user.id,
      workspaceId,
      role: workspace.role,
    };
  }
}
