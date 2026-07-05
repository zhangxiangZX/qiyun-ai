import { Inject, Injectable } from "@nestjs/common";

import { AuthAccessError } from "../../../auth/auth.api";
import type { AuthUserPayload } from "../../../auth/auth.types";
import type { RequestContext } from "../../../workspace";
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

    const workspace = await this.runtime.authApi.assertWorkspaceAccess(user.id, workspaceId);

    return {
      userId: user.id,
      workspaceId,
      role: workspace.role,
    };
  }
}
