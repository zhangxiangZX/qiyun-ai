import { createHash } from "node:crypto";

export function hashDocumentContent(contentBytes: Uint8Array): string {
  return createHash("sha256").update(contentBytes).digest("hex");
}
