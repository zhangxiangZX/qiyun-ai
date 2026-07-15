import type {
  DocumentItem,
  StoredFile,
  UploadFileInput,
  WatermarkResult,
} from "./file-vault.types";
import type { FileVaultRepository } from "./file-vault.repository";

function isTextualContent(mimeType: string | undefined, kind: DocumentItem["kind"]): boolean {
  const type = (mimeType ?? "").toLowerCase();
  if (type.startsWith("text/")) return true;
  if (/json|xml|svg|html|markdown/.test(type)) return true;
  // Plain document-ish kinds whose bytes are text in preview scenarios.
  if (kind === "doc" && (type.includes("csv") || type.includes("text"))) return true;
  return false;
}

export class FileVaultApi {
  constructor(private readonly repository: FileVaultRepository) {}

  listFiles(workspaceId: string): DocumentItem[] {
    return this.repository.list(workspaceId);
  }

  getFileMeta(workspaceId: string, id: string): DocumentItem | null {
    return this.repository.getMeta(workspaceId, id);
  }

  getFile(workspaceId: string, id: string): StoredFile | null {
    return this.repository.get(workspaceId, id);
  }

  uploadFile(workspaceId: string, input: UploadFileInput): DocumentItem {
    return this.repository.create(workspaceId, input);
  }

  deleteFile(workspaceId: string, id: string): boolean {
    return this.repository.remove(workspaceId, id);
  }

  getDownload(workspaceId: string, id: string): StoredFile | null {
    return this.repository.get(workspaceId, id);
  }

  getWatermarked(
    workspaceId: string,
    id: string,
    requester?: string,
  ): WatermarkResult | null {
    const file = this.repository.get(workspaceId, id);
    if (!file) {
      return null;
    }

    if (isTextualContent(file.mimeType, file.kind)) {
      const banner = [
        `【水印 · 机密】${requester ?? file.uploadedBy} · ${file.name} · 仅限授权使用 · ${file.uploadedAt.slice(0, 10)}`,
        "",
      ].join("\n");
      const original = Buffer.from(file.contentBytes).toString("utf8");
      const watermarkedBytes = new Uint8Array(Buffer.from(banner + original, "utf8"));
      this.repository.markWatermarked(workspaceId, id);
      return {
        bytes: watermarkedBytes,
        mimeType: file.mimeType ?? "text/plain; charset=utf-8",
        applied: true,
        mode: "server_text_overlay",
      };
    }

    // Binary assets (images / pdf / office) are currently returned unchanged.
    // The console can still add a visual overlay for preview/download UX, but
    // the backend advertises this honestly through `applied=false`.
    this.repository.markWatermarked(workspaceId, id);
    return {
      bytes: file.contentBytes,
      mimeType: file.mimeType ?? "application/octet-stream",
      applied: false,
      mode: "client_binary_overlay",
    };
  }
}
