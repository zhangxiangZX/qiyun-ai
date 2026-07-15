import { randomUUID } from "node:crypto";

import type {
  DocumentItem,
  DocumentCategory,
  StoredFile,
  UploadFileInput,
} from "./file-vault.types";

interface StoredEntry {
  workspaceId: string;
  file: StoredFile;
}

export interface FileVaultRepository {
  list(workspaceId: string): DocumentItem[];
  get(workspaceId: string, id: string): StoredFile | null;
  getMeta(workspaceId: string, id: string): DocumentItem | null;
  create(workspaceId: string, input: UploadFileInput): DocumentItem;
  markWatermarked(workspaceId: string, id: string): void;
  remove(workspaceId: string, id: string): boolean;
}

function detectKind(fileType: string, fileName: string): DocumentItem["kind"] {
  const type = fileType.toLowerCase();
  const name = fileName.toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) {
    return "image";
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    /wordprocessingml|msword|\.docx?$/.test(type + name) ||
    /text\/markdown|\.md$|\.txt$/.test(type + name)
  ) {
    return "doc";
  }
  if (
    /spreadsheetml|excel|\.xlsx?$/.test(type + name) ||
    /csv|\.csv$/.test(type + name)
  ) {
    return "sheet";
  }
  return "other";
}

export class InMemoryFileVaultRepository implements FileVaultRepository {
  private readonly store = new Map<string, StoredEntry>();

  private key(workspaceId: string, id: string): string {
    return `${workspaceId}:${id}`;
  }

  list(workspaceId: string): DocumentItem[] {
    return [...this.store.values()]
      .filter((entry) => entry.workspaceId === workspaceId)
      .map((entry) => entry.file)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  get(workspaceId: string, id: string): StoredFile | null {
    const entry = this.store.get(this.key(workspaceId, id));
    return entry && entry.workspaceId === workspaceId ? entry.file : null;
  }

  getMeta(workspaceId: string, id: string): DocumentItem | null {
    return this.get(workspaceId, id);
  }

  create(workspaceId: string, input: UploadFileInput): DocumentItem {
    const id = randomUUID();
    const kind = detectKind(input.fileType, input.fileName);
    const watermarkable = kind === "image" || kind === "pdf";
    const item: StoredFile = {
      id,
      name: input.fileName,
      kind,
      category: input.category as DocumentCategory,
      sizeBytes: input.sizeBytes,
      uploadedAt: new Date().toISOString(),
      uploadedBy: input.uploadedBy,
      watermarkable,
      watermarked: false,
      status: "ready",
      mimeType: input.fileType || "application/octet-stream",
      contentBytes: input.contentBytes,
    };
    this.store.set(this.key(workspaceId, id), { workspaceId, file: item });
    return item;
  }

  markWatermarked(workspaceId: string, id: string): void {
    const entry = this.store.get(this.key(workspaceId, id));
    if (entry && entry.workspaceId === workspaceId) {
      entry.file.watermarked = true;
    }
  }

  remove(workspaceId: string, id: string): boolean {
    const entry = this.store.get(this.key(workspaceId, id));
    if (!entry || entry.workspaceId !== workspaceId) {
      return false;
    }
    return this.store.delete(this.key(workspaceId, id));
  }
}
