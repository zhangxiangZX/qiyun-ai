"use client";

import type { ReactNode } from "react";

import { PanelState, type PanelStateKind } from "@qiyun/ui";

import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";

export interface DashboardPanelBodyProps {
  state: "loading" | "ready" | "error" | "empty";
  error?: unknown;
  errorFallback?: string;
  onRetry?: () => void;
  retryLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonRows?: number;
  className?: string;
  children?: ReactNode;
}

function toPanelKind(state: DashboardPanelBodyProps["state"]): PanelStateKind {
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  if (state === "empty") return "empty";
  return "ready";
}

export function DashboardPanelBody({
  state,
  error,
  errorFallback = "加载失败，请稍后重试。",
  onRetry,
  retryLabel = "重试",
  emptyTitle = "暂无数据",
  emptyDescription = "当前工作区还没有相关记录。",
  skeletonRows = 3,
  className,
  children,
}: DashboardPanelBodyProps) {
  if (state === "error") {
    const presentation = resolveRequestErrorPresentation(error, errorFallback);
    return (
      <div className={className}>
        <ConsoleRequestError
          kind={presentation.kind}
          message={presentation.message}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      </div>
    );
  }

  return (
    <PanelState
      kind={toPanelKind(state)}
      skeletonRows={skeletonRows}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      className={className}
    >
      {children}
    </PanelState>
  );
}
