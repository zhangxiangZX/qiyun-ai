"use client";

import {
  AlertCircle,
  Ban,
  FileQuestion,
  RefreshCw,
  SplitSquareVertical,
  Wrench,
} from "lucide-react";

import { Badge, Button } from "@qiyun/ui";

import {
  classifyDocumentFailure,
  FAILURE_CATEGORY_LABELS,
  getFailureDisplayTitle,
  type DocumentFailureCategory,
} from "@/lib/knowledge/failure-reason";
import type { DocumentErrorCode } from "@/lib/knowledge/types";

const CATEGORY_ICONS: Record<DocumentFailureCategory, typeof AlertCircle> = {
  format_unsupported: Ban,
  no_extractable_text: FileQuestion,
  processing_failed: Wrench,
  parser_unstable: SplitSquareVertical,
  unknown: AlertCircle,
};

const CATEGORY_VARIANTS: Record<
  DocumentFailureCategory,
  "destructive" | "warning" | "outline"
> = {
  format_unsupported: "destructive",
  no_extractable_text: "warning",
  processing_failed: "destructive",
  parser_unstable: "warning",
  unknown: "outline",
};

export function DocumentFailurePanel({
  errorCode,
  errorMessage,
  fileType,
  onRetry,
  compact = false,
}: {
  errorCode?: DocumentErrorCode | null;
  errorMessage: string | null;
  fileType?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const insight = classifyDocumentFailure({ errorCode, errorMessage, fileType });
  const Icon = CATEGORY_ICONS[insight.category];
  const displayTitle = getFailureDisplayTitle(insight);
  const showTechnicalDetail =
    insight.technicalDetail &&
    insight.technicalDetail !== insight.description &&
    (errorCode || insight.category === "unknown");

  return (
    <div
      className={`rounded-control border border-destructive/30 bg-destructive/5 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      role="alert"
    >
      <div className="flex flex-wrap items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-medium text-destructive ${compact ? "text-xs" : "text-sm"}`}>
              {displayTitle}
            </p>
            <Badge variant={CATEGORY_VARIANTS[insight.category]} className="text-[10px]">
              {FAILURE_CATEGORY_LABELS[insight.category]}
            </Badge>
            {errorCode ? (
              <Badge variant="outline" className="font-mono text-[10px]">
                {errorCode}
              </Badge>
            ) : null}
            {insight.retryable ? (
              <Badge variant="outline" className="text-[10px]">
                可重试
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                需更换文件
              </Badge>
            )}
          </div>
          {!errorCode && insight.category === "unknown" ? (
            <p className={`text-xs text-muted-foreground ${compact ? "" : "text-sm"}`}>
              未收到 errorCode{errorMessage ? "" : " 与 errorMessage"}，以下为保底说明（未知错误 / 可重试）。
            </p>
          ) : null}
          <p className={`leading-relaxed text-foreground ${compact ? "text-xs" : "text-sm"}`}>
            {insight.description}
          </p>
          {showTechnicalDetail ? (
            <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
              <span className="font-medium text-foreground">技术信息：</span>
              {insight.technicalDetail}
            </p>
          ) : null}
          <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            <span className="font-medium text-foreground">建议：</span>
            {insight.actionHint}
          </p>
        </div>
      </div>
      {insight.retryable && onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 min-h-11 gap-1.5"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          重试索引
        </Button>
      ) : null}
    </div>
  );
}
