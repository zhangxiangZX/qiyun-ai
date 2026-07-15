import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { json, matchPath, type ApiResult } from "../../http/api-result";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import type { DocumentCategory } from "../../file-vault/file-vault.types";

const VALID_CATEGORIES: DocumentCategory[] = [
  "brochure",
  "spec",
  "quote",
  "contract",
  "lead",
  "other",
];

function downloadHeaders(name: string, mimeType: string): Record<string, string> {
  const fallbackName = name.replace(/[^\x20-\x7e]/g, "_") || "download";
  return {
    "content-type": mimeType || "application/octet-stream",
    "content-disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "cache-control": "no-store",
  };
}

@Injectable()
export class FileVaultRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string, requestId?: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/files" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      return json(
        200,
        { documents: this.runtime.fileVaultApi.listFiles(context.workspaceId) },
        requestId,
      );
    }

    if (pathname === "/files" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return json(
          400,
          { code: "BAD_REQUEST", message: "请求体应为 multipart/form-data。" },
          requestId,
        );
      }
      const file = form.get("file");
      if (!(file instanceof File)) {
        return json(400, { code: "BAD_REQUEST", message: "缺少上传文件。" }, requestId);
      }
      const rawCategory = String(form.get("category") ?? "other");
      const category = (VALID_CATEGORIES as string[]).includes(rawCategory)
        ? (rawCategory as DocumentCategory)
        : "other";
      const uploadedBy = String(form.get("uploadedBy") ?? context.role ?? "unknown");
      const contentBytes = new Uint8Array(await file.arrayBuffer());
      const created = this.runtime.fileVaultApi.uploadFile(context.workspaceId, {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBytes,
        category,
        uploadedBy,
      });
      await this.runtime.persist();
      return json(201, created, requestId);
    }

    const fileMatch = matchPath("/files/:id", pathname);
    const subMatch = matchPath("/files/:id/:action", pathname);

    if (fileMatch && method === "GET" && !subMatch) {
      const context = await this.authContext.resolve(request.headers);
      const meta = this.runtime.fileVaultApi.getFileMeta(
        context.workspaceId,
        fileMatch.params.id,
      );
      if (!meta) {
        return json(404, { code: "NOT_FOUND", message: "文档不存在。" }, requestId);
      }
      return json(200, meta, requestId);
    }

    if (fileMatch && method === "DELETE" && !subMatch) {
      const context = await this.authContext.resolve(request.headers);
      const removed = this.runtime.fileVaultApi.deleteFile(
        context.workspaceId,
        fileMatch.params.id,
      );
      if (!removed) {
        return json(404, { code: "NOT_FOUND", message: "文档不存在。" }, requestId);
      }
      await this.runtime.persist();
      return json(200, { ok: true }, requestId);
    }

    const action = subMatch?.params.action;

    if (subMatch && action === "download" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const file = this.runtime.fileVaultApi.getDownload(
        context.workspaceId,
        subMatch.params.id,
      );
      if (!file) {
        return json(404, { code: "NOT_FOUND", message: "文档不存在。" }, requestId);
      }
      return {
        status: 200,
        headers: downloadHeaders(file.name, file.mimeType ?? "application/octet-stream"),
        bytes: file.contentBytes,
      };
    }

    if (subMatch && action === "watermark" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const meta = this.runtime.fileVaultApi.getFileMeta(
        context.workspaceId,
        subMatch.params.id,
      );
      const result = this.runtime.fileVaultApi.getWatermarked(
        context.workspaceId,
        subMatch.params.id,
        context.role,
      );
      if (!result) {
        return json(404, { code: "NOT_FOUND", message: "文档不存在。" }, requestId);
      }
      const fileName = meta ? `watermarked-${meta.name}` : "watermarked";
      return {
        status: 200,
        headers: {
          ...downloadHeaders(fileName, result.mimeType),
          "x-watermark-applied": result.applied ? "true" : "false",
          "x-watermark-mode": result.mode,
        },
        bytes: result.bytes,
      };
    }

    return null;
  }
}
