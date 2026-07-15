import { Inject, Injectable } from "@nestjs/common";
import type { ApiRuntime } from "../../runtime";
import { type ApiResult } from "../../http/api-result";
import { fail, ok, ApiCode } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import type { CreateInquiryInput } from "../../sales/sales.types";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

function assertWriteRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin" && role !== "member") {
    throw new AuthAccessError("Workspace member write access is required.");
  }
}

@Injectable()
export class QuickEntryRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/quick-entry/ai-extract" && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      assertWriteRole(ctx.role);
      const body = await readJsonBody<{ text?: string }>(request);
      const text = body.text?.trim() ?? "";
      if (text.length < 2) return fail(ApiCode.VALIDATION, "text is required.", 400);
      if (text.length > 10_000) return fail(ApiCode.VALIDATION, "text is too long.", 400);
      return ok(await this.runtime.quickEntryApi.aiExtract(ctx, text));
    }

    if (pathname === "/quick-entry/check-duplicate" && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      assertWriteRole(ctx.role);
      const body = await readJsonBody<{ phone?: string }>(request);
      const phone = (body.phone ?? "").replace(/[^\d+]/g, "");
      if (phone.replace(/\D/g, "").length < 7) {
        return fail(ApiCode.VALIDATION, "A valid phone number is required.", 400);
      }
      return ok(await this.runtime.quickEntryApi.checkDuplicate(ctx, phone));
    }

    if (pathname === "/quick-entry/recent" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      const requested = Number(new URL(request.url).searchParams.get("limit") ?? 10);
      const limit = Number.isFinite(requested) ? Math.min(50, Math.max(1, Math.trunc(requested))) : 10;
      return ok(await this.runtime.salesApi.listInquiries(ctx, { limit }));
    }

    if (pathname === "/quick-entry/create-inquiry" && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      assertWriteRole(ctx.role);
      const body = await readJsonBody<CreateInquiryInput & { customerName?: string }>(request);
      if (!body.customerName?.trim()) {
        return fail(ApiCode.VALIDATION, "customerName is required.", 400);
      }
      if (body.nextActionAt && Number.isNaN(Date.parse(body.nextActionAt))) {
        return fail(ApiCode.VALIDATION, "nextActionAt must be an ISO date.", 400);
      }
      if (body.ownerId) {
        const members = await this.runtime.authApi.listWorkspaceMembers(ctx);
        if (!members.some((member) => member.userId === body.ownerId)) {
          return fail(ApiCode.VALIDATION, "ownerId is not a member of this workspace.", 400);
        }
      }
      const created = await this.runtime.quickEntryApi.createInquiryFromAI(ctx, {
        ...body,
        customerName: body.customerName.trim(),
      });
      await this.runtime.persist();
      return ok(created);
    }

    return null;
  }
}
