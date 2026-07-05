import { createHash, randomUUID } from "node:crypto";

export function generateSiteKey(): string {
  return `pk_${randomUUID()}`;
}

export function hashSiteKey(siteKey: string): string {
  return createHash("sha256").update(siteKey, "utf8").digest("hex");
}

export function siteKeyPrefix(siteKey: string): string {
  return siteKey.slice(0, 12);
}
