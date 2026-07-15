import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { json, matchPath, type ApiResult } from "../../http/api-result";
import { readJsonBody } from "../../http/request-body";
import { BearerAuthGuard } from "./guards/bearer-auth.guard";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { runWithBypassRls } from "../../db/tenant-context";

@Injectable()
export class PlatformRouteService {
  constructor(
    @Inject(BearerAuthGuard) private readonly bearerAuthGuard: BearerAuthGuard,
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
  ) {}

  async handle(request: Request, pathname: string, requestId?: string): Promise<ApiResult | null> {
    // 平台级操作天然跨租户，整体以旁路执行（受控：仅平台路由）。
    return runWithBypassRls(async () => {
    const method = request.method;

    if (pathname === "/platform/workspaces" && method === "GET") {
      const user = await this.bearerAuthGuard.assertBearerToken(request.headers);
      const items = await this.runtime.authApi.listCustomerWorkspaces(user.id);
      return json(200, items, requestId);
    }

    if (pathname === "/platform/workspaces" && method === "POST") {
      const user = await this.bearerAuthGuard.assertBearerToken(request.headers);
      const body = await readJsonBody<{
        companyName?: string;
        website?: string;
        plan?: string;
        contactName?: string;
        contactEmail?: string;
        contactPhone?: string;
        adminEmail?: string;
      }>(request);
      const result = await this.runtime.authApi.provisionCustomerWorkspace(user.id, {
        companyName: body.companyName ?? "",
        website: body.website,
        plan: body.plan ?? "",
        contactName: body.contactName ?? "",
        contactEmail: body.contactEmail ?? "",
        contactPhone: body.contactPhone,
        adminEmail: body.adminEmail ?? "",
      });
      await this.runtime.persist();
      return json(201, result, requestId);
    }

    if (pathname === "/platform/trial-requests" && method === "GET") {
      const user = await this.bearerAuthGuard.assertBearerToken(request.headers);
      const items = await this.runtime.authApi.listTrialRequests(user.id);
      return json(200, items, requestId);
    }

    const trialRequestMatch = matchPath("/platform/trial-requests/:id", pathname);
    if (trialRequestMatch && method === "PATCH") {
      const user = await this.bearerAuthGuard.assertBearerToken(request.headers);
      const body = await readJsonBody<{
        action?: "approve" | "reject";
        plan?: string;
        adminEmail?: string;
        reviewNotes?: string;
      }>(request);
      const result = await this.runtime.authApi.reviewTrialRequest(
        user.id,
        trialRequestMatch.params.id,
        body,
      );
      await this.runtime.persist();
      return json(200, result, requestId);
    }

    return null;
    });
  }
}
