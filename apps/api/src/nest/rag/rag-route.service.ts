import { Inject, Injectable } from "@nestjs/common";

import { writeWorkspaceAudit } from "../../audit/audit-write";
import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok, fail, ApiCode } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

function assertManagerRole(role: string): void {
  if (role !== "owner" && role !== "admin") {
    throw new AuthAccessError("Workspace manager access is required.");
  }
}

@Injectable()
export class RagRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/bots" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.ragService.listBots(context.workspaceId));
    }
    if (pathname === "/bots" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const body = await readJsonBody<{ name?: string; status?: "draft" | "active" | "disabled"; knowledgeBaseIds?: string[] }>(request);
      const created = await this.runtime.ragService.createBot({
        workspaceId: context.workspaceId, name: body.name ?? "", status: body.status, knowledgeBaseIds: body.knowledgeBaseIds ?? [],
      });
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "bot",
        action: "create",
        targetId: created.id,
        detail: { name: created.name },
      });
      await this.runtime.persist();
      return ok(created);
    }

    const botMatch = matchPath("/bots/:id", pathname);
    if (botMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const bot = await this.runtime.ragService.getBot(context.workspaceId, botMatch.params.id);
      return ok(bot);
    }

    const embedCodeMatch = matchPath("/bots/:id/embed-code", pathname);
    if (embedCodeMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const site = await this.runtime.chatService.getPreviewSite(context.workspaceId, embedCodeMatch.params.id);
      if (!site) {
        return fail(ApiCode.NOT_FOUND, "No site found for this bot. Create a site first.", 404);
      }
      const widgetScriptUrl = `${new URL(request.url).origin}/public/widget.js`;
      const apiBase = `${new URL(request.url).origin}`;
      const snippet = `<script src="${widgetScriptUrl}" data-api-base="${apiBase}" data-bot-id="${site.botId}" data-site-key="ROTATE_KEY_FIRST" async></script>`;
      return ok({ botId: site.botId, siteId: site.id, siteKeyPrefix: site.siteKeyPrefix, snippet,
        notice: "The siteKey in this snippet is a placeholder. Rotate the site key via POST /sites/:id/rotate-key to obtain the real key, then replace ROTATE_KEY_FIRST with the revealed key." });
    }

    if (botMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const body = await readJsonBody<Record<string, unknown>>(request);
      const updated = await this.runtime.ragService.patchBot({ id: botMatch.params.id, workspaceId: context.workspaceId, patch: body as Parameters<ApiRuntime["ragService"]["patchBot"]>[0]["patch"] });
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "bot",
        action: "update",
        targetId: botMatch.params.id,
        detail: body,
      });
      await this.runtime.persist();
      return ok(updated);
    }
    if (botMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const result = await this.runtime.ragService.deleteBot(context.workspaceId, botMatch.params.id);
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "bot",
        action: "delete",
        targetId: botMatch.params.id,
      });
      await this.runtime.persist();
      return ok(result);
    }

    const botCopyMatch = matchPath("/bots/:id/copy", pathname);
    if (botCopyMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const copy = await this.runtime.ragService.copyBot(context.workspaceId, botCopyMatch.params.id);
      await this.runtime.persist();
      return ok(copy);
    }

    const botPublishMatch = matchPath("/bots/:id/publish", pathname);
    if (botPublishMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const published = await this.runtime.ragService.publishBot(context.workspaceId, botPublishMatch.params.id);
      writeWorkspaceAudit(this.runtime.auditApi, context, {
        module: "bot",
        action: "publish",
        targetId: botPublishMatch.params.id,
      });
      await this.runtime.persist();
      return ok(published);
    }

    const botTestChatMatch = matchPath("/bots/:id/test-chat", pathname);
    if (botTestChatMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ message?: string }>(request);
      const reply = await this.runtime.ragService.testChatBot(context.workspaceId, botTestChatMatch.params.id, body.message ?? "你好");
      return ok(reply);
    }

    return null;
  }
}
