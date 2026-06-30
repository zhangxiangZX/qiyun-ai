import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./constants";
import { getFileExtension } from "./format";

export function validateKnowledgeFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `Only ${ALLOWED_EXTENSIONS.join(", ")} files are supported.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Each file must be 20 MB or smaller.";
  }

  if (file.size === 0) {
    return "Empty files cannot be uploaded.";
  }

  return null;
}

export function createDocumentId(): string {
  return `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function createKnowledgeBaseId(): string {
  return `kb_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
