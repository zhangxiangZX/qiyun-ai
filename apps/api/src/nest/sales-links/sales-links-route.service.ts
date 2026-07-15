import { Inject, Injectable } from "@nestjs/common";
import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

function assertWriteRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin" && role !== "member") {
    throw new AuthAccessError("Write access is required.");
  }
}
function assertManagerRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new AuthAccessError("Workspace manager access is required.");
  }
}

@Injectable()
export class SalesLinksRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/sales-links" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.salesLinksApi.list(ctx));
    }
    if (pathname === "/sales-links" && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      assertWriteRole(ctx.role);
      const body = await readJsonBody<{ name?: string; channel?: string; targetUrl?: string; slug?: string }>(request);
      const created = await this.runtime.salesLinksApi.create(ctx, { name: body.name ?? "", channel: body.channel as Parameters<ApiRuntime["salesLinksApi"]["create"]>[1]["channel"], targetUrl: body.targetUrl, slug: body.slug });
      await this.runtime.persist();
      return ok(created);
    }

    const linkMatch = matchPath("/sales-links/:id", pathname);
    if (linkMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.salesLinksApi.getById(ctx, linkMatch.params.id));
    }
    if (linkMatch && method === "PATCH") {
      const ctx = await this.authContext.resolve(request.headers);
      assertWriteRole(ctx.role);
      const body = await readJsonBody<Record<string, unknown>>(request);
      const updated = await this.runtime.salesLinksApi.update(ctx, linkMatch.params.id, body as Parameters<ApiRuntime["salesLinksApi"]["update"]>[2]);
      await this.runtime.persist();
      return ok(updated);
    }
    if (linkMatch && method === "DELETE") {
      const ctx = await this.authContext.resolve(request.headers);
      assertManagerRole(ctx.role);
      const result = await this.runtime.salesLinksApi.delete(ctx, linkMatch.params.id);
      await this.runtime.persist();
      return ok(result);
    }

    const scanLogsMatch = matchPath("/sales-links/:id/scan-logs", pathname);
    if (scanLogsMatch && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      const logs = await this.runtime.salesLinksApi.listScanLogs(ctx, scanLogsMatch.params.id, 100);
      return ok(logs);
    }

    return null;
  }
}
