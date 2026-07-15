import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./constants";
import { getFileExtension } from "./format";

export function validateKnowledgeFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `仅支持 ${ALLOWED_EXTENSIONS.join("、")} 格式。`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "单个文件不能超过 20 MB。";
  }

  if (file.size === 0) {
    return "不能上传空文件。";
  }

  return null;
}

export function createDocumentId(): string {
  return `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function createKnowledgeBaseId(): string {
  return `kb_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
