import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok } from "../../http/api-envelope";
import { readJsonBody, readUploadBody } from "../../http/request-body";
import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

function assertManagerRole(role: WorkspaceMemberRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new AuthAccessError("Workspace manager access is required.");
  }
}

@Injectable()
export class DocumentsRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/knowledge-bases" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.listKnowledgeBases(context));
    }
    if (pathname === "/knowledge-bases" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const body = await readJsonBody<{ name?: string }>(request);
      const created = await this.runtime.documentApi.createKnowledgeBase(context, { name: body.name ?? "" });
      await this.runtime.persist();
      return ok(created);
    }

    const kbMatch = matchPath("/knowledge-bases/:id", pathname);
    if (kbMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.getKnowledgeBase(context, kbMatch.params.id));
    }
    if (kbMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const body = await readJsonBody<{ name?: string; status?: "active" | "disabled" }>(request);
      const updated = await this.runtime.documentApi.updateKnowledgeBase(context, kbMatch.params.id, body);
      await this.runtime.persist();
      return ok(updated);
    }
    if (kbMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const deleted = await this.runtime.documentApi.deleteKnowledgeBase(context, kbMatch.params.id);
      await this.runtime.persist();
      return ok(deleted);
    }

    const kbDocsMatch = matchPath("/knowledge-bases/:id/documents", pathname);
    if (kbDocsMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.listKnowledgeBaseDocuments(context, kbDocsMatch.params.id));
    }
    if (kbDocsMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const files = await readUploadBody(request);
      const uploaded = await this.runtime.documentApi.uploadDocuments(context, kbDocsMatch.params.id, files);
      await this.runtime.persist();
      return ok(uploaded);
    }

    const docMatch = matchPath("/documents/:id", pathname);
    if (docMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.getDocument(context, docMatch.params.id));
    }
    if (docMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const deleted = await this.runtime.documentApi.deleteDocument(context, docMatch.params.id);
      await this.runtime.persist();
      return ok(deleted);
    }

    const reindexMatch = matchPath("/documents/:id/reindex", pathname);
    if (reindexMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const reindexed = await this.runtime.documentApi.reindexDocument(context, reindexMatch.params.id);
      await this.runtime.persist();
      return ok(reindexed);
    }

    const reparseMatch = matchPath("/documents/:id/reparse", pathname);
    if (reparseMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const reparsed = await this.runtime.documentApi.reparseDocument(context, reparseMatch.params.id);
      await this.runtime.persist();
      return ok(reparsed);
    }

    const tagsMatch = matchPath("/documents/:id/tags", pathname);
    if (tagsMatch && method === "PATCH") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const body = await readJsonBody<{ tags?: string[] }>(request);
      const updated = await this.runtime.documentApi.updateDocumentTags(context, tagsMatch.params.id, body.tags ?? []);
      await this.runtime.persist();
      return ok(updated);
    }

    const moveMatch = matchPath("/documents/:id/move", pathname);
    if (moveMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const body = await readJsonBody<{ knowledgeBaseId?: string }>(request);
      const moved = await this.runtime.documentApi.moveDocument(context, moveMatch.params.id, body.knowledgeBaseId ?? "");
      await this.runtime.persist();
      return ok(moved);
    }

    const chunksMatch = matchPath("/documents/:id/chunks", pathname);
    if (chunksMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.listDocumentChunks(context, chunksMatch.params.id));
    }

    if (pathname === "/document-jobs/dead-letter" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.listDeadLetterJobs(context));
    }

    const deadLetterMatch = matchPath("/document-jobs/dead-letter/:jobId", pathname);
    if (deadLetterMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.documentApi.getDeadLetterJob(context, deadLetterMatch.params.jobId));
    }

    const deadLetterRetryMatch = matchPath("/document-jobs/dead-letter/:jobId/retry", pathname);
    if (deadLetterRetryMatch && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const retried = await this.runtime.documentApi.retryDeadLetterJob(context, deadLetterRetryMatch.params.jobId);
      return ok(retried);
    }

    if (deadLetterMatch && method === "DELETE") {
      const context = await this.authContext.resolve(request.headers);
      assertManagerRole(context.role);
      const dismissed = await this.runtime.documentApi.dismissDeadLetterJob(context, deadLetterMatch.params.jobId);
      return ok(dismissed);
    }

    return null;
  }
}
