import { Inject, Injectable } from "@nestjs/common";

import type { RequestContext } from "../../workspace";
import { BearerAuthGuard } from "./guards/bearer-auth.guard";
import { WorkspaceAuthGuard } from "./guards/workspace-auth.guard";

@Injectable()
export class NestAuthContextService {
  constructor(
    @Inject(BearerAuthGuard)
    private readonly bearerAuthGuard: BearerAuthGuard,
    @Inject(WorkspaceAuthGuard)
    private readonly workspaceAuthGuard: WorkspaceAuthGuard,
  ) {}

  resolve(headers: Headers): Promise<RequestContext> {
    return this.bearerAuthGuard.assertBearerToken(headers).then((user) =>
      this.workspaceAuthGuard.resolveWorkspaceContext(headers, user),
    );
  }
}
