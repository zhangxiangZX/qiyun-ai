import type { DocumentStatus } from "./types";

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const STATUS_PROGRESSION: DocumentStatus[] = [
  "uploaded",
  "parsing",
  "indexing",
  "ready",
];
