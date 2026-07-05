"use client";

import { Alert, Button } from "@qiyun/ui";

import { isApiError, isRateLimited, getApiErrorMessage, getRateLimitMessage } from "@/lib/api/errors";

export type ConsoleRequestErrorKind =
  | "network"
  | "permission"
  | "preview"
  | "rateLimit"
  | "unknown";

const TITLES: Record<ConsoleRequestErrorKind, string> = {
  network: "网络请求失败",
  permission: "没有操作权限",
  preview: "演示模式限制",
  rateLimit: "请求过于频繁",
  unknown: "操作失败",
};

export interface ConsoleRequestErrorProps {
  kind?: ConsoleRequestErrorKind;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ConsoleRequestError({
  kind = "unknown",
  message,
  onRetry,
  retryLabel = "重试",
}: ConsoleRequestErrorProps) {
  const variant =
    kind === "permission" || kind === "rateLimit" ? "warning" : "error";

  return (
    <div className="space-y-3">
      <Alert variant={variant} title={TITLES[kind]}>
        {message}
        {kind === "rateLimit" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            这是服务端限流保护，请等待片刻后再试，避免连续快速点击。
          </p>
        ) : null}
      </Alert>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={kind === "rateLimit"}>
          {kind === "rateLimit" ? "请稍后再试" : retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function resolveRequestErrorKind(error: unknown): ConsoleRequestErrorKind {
  if (isRateLimited(error)) return "rateLimit";

  if (isApiError(error)) {
    if (error.code === "PREVIEW_MODE" || error.code === "UPSTREAM_REQUIRED" || error.status === 503) {
      return "preview";
    }
    if (error.status === 401 || error.status === 403 || error.code === "UNAUTHORIZED") {
      return "permission";
    }
    if (error.status >= 500 || error.status === 0) return "network";
  }

  if (error instanceof Error) {
    if (error.message.includes("Preview mode")) return "preview";
    if (error.message.includes("403") || error.message.includes("权限")) return "permission";
    if (error.message.includes("fetch") || error.message.includes("网络")) return "network";
  }
  return "unknown";
}

export function resolveRequestErrorPresentation(
  error: unknown,
  fallback: string,
): { kind: ConsoleRequestErrorKind; message: string } {
  const kind = resolveRequestErrorKind(error);
  if (kind === "rateLimit") {
    return { kind, message: getRateLimitMessage(error) };
  }
  return { kind, message: getApiErrorMessage(error, fallback) };
}
