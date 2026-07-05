export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "PREVIEW_MODE"
  | "RATE_LIMITED"
  | "UPSTREAM_REQUIRED"
  | "UNAUTHORIZED";

const KNOWN_CODES = new Set<string>([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "INTERNAL_ERROR",
  "PREVIEW_MODE",
  "RATE_LIMITED",
  "UPSTREAM_REQUIRED",
  "UNAUTHORIZED",
]);

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeApiErrorCode(status: number, code?: string): ApiErrorCode {
  if (code && KNOWN_CODES.has(code)) {
    return code as ApiErrorCode;
  }
  if (status === 429) return "RATE_LIMITED";
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 503) return "PREVIEW_MODE";
  if (status === 404) return "NOT_FOUND";
  return "INTERNAL_ERROR";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isRateLimited(error: unknown): boolean {
  if (isApiError(error)) {
    return error.status === 429 || error.code === "RATE_LIMITED";
  }
  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    return text.includes("rate limit") || text.includes("过于频繁") || text.includes("retry in");
  }
  return false;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getRateLimitMessage(error: unknown, fallback = "请求过于频繁，请稍后再试。"): string {
  const message = getApiErrorMessage(error, fallback);
  if (/retry in \d+s/i.test(message)) {
    return message;
  }
  const match = message.match(/(\d+)\s*s/);
  if (match) {
    return `请求过于频繁，请 ${match[1]} 秒后再试。`;
  }
  return message || fallback;
}
