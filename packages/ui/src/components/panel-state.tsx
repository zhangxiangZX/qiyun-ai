import type { ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "../lib/utils";
import { Alert } from "./alert";
import { Button } from "./button";
import { Skeleton } from "./skeleton";

export type PanelStateKind = "loading" | "empty" | "error" | "success" | "ready";

export interface PanelStateProps {
  kind: PanelStateKind;
  /** Shown when kind is empty */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Shown when kind is error */
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Shown when kind is success (inline banner) */
  successTitle?: string;
  successMessage?: string;
  /** Skeleton rows when loading */
  skeletonRows?: number;
  className?: string;
  children?: ReactNode;
}

export function PanelState({
  kind,
  emptyTitle = "暂无数据",
  emptyDescription = "有数据后会显示在这里。",
  errorTitle = "加载失败",
  errorMessage,
  onRetry,
  retryLabel = "重试",
  successTitle,
  successMessage,
  skeletonRows = 2,
  className,
  children,
}: PanelStateProps) {
  if (kind === "ready" && children) {
    return <div className={className}>{children}</div>;
  }

  if (kind === "loading") {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true">
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-control" />
        ))}
      </div>
    );
  }

  if (kind === "error") {
    return (
      <div className={cn("space-y-3", className)}>
        <Alert variant="error" title={errorTitle}>
          {errorMessage ?? "请稍后重试。"}
        </Alert>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (kind === "success") {
    return (
      <div className={cn("space-y-3", className)}>
        {(successTitle || successMessage) ? (
          <Alert variant="success" title={successTitle ?? "已更新"}>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              {successMessage}
            </span>
          </Alert>
        ) : null}
        {children}
      </div>
    );
  }

  if (kind === "empty") {
    return (
      <div
        className={cn(
          "rounded-control border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-card-foreground">{emptyTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  if (kind === "ready") {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      加载中…
    </div>
  );
}
