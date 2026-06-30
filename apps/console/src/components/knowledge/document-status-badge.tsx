"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@qiyun/ui";

import {
  DOCUMENT_STATUS_LABELS,
  getStatusBadgeVariant,
} from "@/lib/knowledge/status-labels";
import type { DocumentStatus } from "@/lib/knowledge/types";

const STATUS_ICONS: Record<DocumentStatus, typeof Loader2> = {
  uploaded: Clock3,
  parsing: Loader2,
  indexing: Loader2,
  ready: CheckCircle2,
  failed: AlertCircle,
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const Icon = STATUS_ICONS[status];
  const spinning = status === "parsing" || status === "indexing";

  return (
    <Badge variant={getStatusBadgeVariant(status)} className="gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} aria-hidden />
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DocumentStatusBadgeWithRetry({
  status,
  errorMessage,
  onRetry,
}: {
  status: DocumentStatus;
  errorMessage: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-1">
      <DocumentStatusBadge status={status} />
      {status === "failed" && errorMessage ? (
        <p className="max-w-64 text-xs text-destructive">{errorMessage}</p>
      ) : null}
      {status === "failed" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Retry
        </button>
      ) : null}
    </div>
  );
}
