"use client";

import { Layers, Clock3 } from "lucide-react";

import { Badge } from "@qiyun/ui";

import {
  formatDateTime,
  formatFileSize,
  formatRelativeTime,
} from "@/lib/knowledge/format";
import { DOCUMENT_STATUS_DESCRIPTIONS } from "@/lib/knowledge/status-labels";
import { getErrorCodeLabel } from "@/lib/knowledge/failure-reason";
import type { DocumentErrorCode, DocumentStatus, KnowledgeDocument } from "@/lib/knowledge/types";

export function DocumentFileMeta({ document }: { document: KnowledgeDocument }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{document.fileName}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {document.fileType.toUpperCase()} · {formatFileSize(document.sizeBytes)}
      </p>
    </div>
  );
}

export function DocumentChunkMeta({
  chunkCount,
  status,
}: {
  chunkCount: number | null;
  status: DocumentStatus;
}) {
  const ready = status === "ready";
  const value = chunkCount ?? null;

  return (
    <div className="flex items-center gap-1.5">
      <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-sm tabular-nums text-foreground">
        {value !== null ? value : "—"}
      </span>
      <span className="text-xs text-muted-foreground">
        {ready && value !== null ? "块" : ready ? "块" : "待生成"}
      </span>
    </div>
  );
}

export function DocumentUpdatedMeta({ updatedAt }: { updatedAt: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <time dateTime={updatedAt}>{formatDateTime(updatedAt)}</time>
      </div>
      <p className="pl-5 text-xs text-muted-foreground">{formatRelativeTime(updatedAt)}</p>
    </div>
  );
}

export function DocumentStatusHint({
  status,
  errorCode,
}: {
  status: DocumentStatus;
  errorCode?: DocumentErrorCode | null;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {DOCUMENT_STATUS_DESCRIPTIONS[status]}
      </p>
      {status === "failed" && errorCode ? (
        <p className="text-xs text-muted-foreground">
          错误类型：{getErrorCodeLabel(errorCode)}
        </p>
      ) : null}
    </div>
  );
}

export function DocumentStatusChip({ status }: { status: DocumentStatus }) {
  if (status === "ready") {
    return (
      <Badge variant="success" className="text-[10px]">
        可用于检索
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        需处理
      </Badge>
    );
  }
  return (
    <Badge variant="info" className="text-[10px]">
      处理中
    </Badge>
  );
}
