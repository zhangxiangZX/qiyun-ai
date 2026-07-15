"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Badge, Button } from "@qiyun/ui";

import { DocumentFailurePanel } from "@/components/knowledge/document-failure-panel";
import { DocumentPipelineStepper } from "@/components/knowledge/document-pipeline-stepper";
import {
  DOCUMENT_POLL_INTERVAL_SECONDS,
  DOCUMENT_PROCESSING_STAGE_LABELS,
  DOCUMENT_STATUS_POLLING_NOTE,
  DOCUMENT_STATUS_PROGRESS_HINTS,
} from "@/lib/knowledge/status-labels";
import type { DocumentErrorCode, DocumentStatus } from "@/lib/knowledge/types";

export type UploadQueuePhase = "upload" | "processing" | "done";

export type UploadQueueStatus =
  | "queued"
  | "uploading"
  | "upload_error"
  | "processing"
  | "processing_failed"
  | "completed";

export type UploadQueueItem = {
  fileName: string;
  status: UploadQueueStatus;
  phase: UploadQueuePhase;
  errorMessage?: string;
  documentId?: string;
  processingStatus?: DocumentStatus;
  processingError?: string | null;
  processingErrorCode?: DocumentErrorCode | null;
};

const UPLOAD_STATUS_LABELS: Record<UploadQueueStatus, string> = {
  queued: "排队中",
  uploading: "上传中",
  upload_error: "上传失败",
  processing: "处理中",
  processing_failed: "处理失败",
  completed: "已完成",
};

const UPLOAD_STATUS_VARIANTS: Record<
  UploadQueueStatus,
  "outline" | "info" | "success" | "destructive"
> = {
  queued: "outline",
  uploading: "info",
  upload_error: "destructive",
  processing: "info",
  processing_failed: "destructive",
  completed: "success",
};

function resolveProcessingLabel(item: UploadQueueItem): string | null {
  if (item.processingStatus) {
    return DOCUMENT_PROCESSING_STAGE_LABELS[item.processingStatus];
  }
  if (item.status === "processing") {
    return "等待状态…";
  }
  return null;
}

function StatusIcon({ status }: { status: UploadQueueStatus }) {
  if (status === "queued") {
    return <Clock3 className="h-4 w-4" aria-hidden />;
  }
  if (status === "uploading" || status === "processing") {
    return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4" aria-hidden />;
  }
  return <AlertCircle className="h-4 w-4" aria-hidden />;
}

export function UploadProgressList({
  items,
  onRetryUpload,
  onRetryProcessing,
}: {
  items: UploadQueueItem[];
  onRetryUpload?: (fileName: string) => void;
  onRetryProcessing?: (documentId: string) => void;
}) {
  if (!items.length) {
    return null;
  }

  const queuedCount = items.filter((item) => item.status === "queued").length;
  const uploadingCount = items.filter((item) => item.status === "uploading").length;
  const processingCount = items.filter((item) => item.status === "processing").length;
  const completedCount = items.filter((item) => item.status === "completed").length;
  const uploadFailedCount = items.filter((item) => item.status === "upload_error").length;
  const processingFailedCount = items.filter(
    (item) => item.status === "processing_failed",
  ).length;

  return (
    <section className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">上传与处理进度</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{DOCUMENT_STATUS_POLLING_NOTE}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {queuedCount > 0 ? <Badge variant="outline">排队 {queuedCount}</Badge> : null}
          {uploadingCount > 0 ? <Badge variant="info">上传中 {uploadingCount}</Badge> : null}
          {processingCount > 0 ? <Badge variant="info">处理中 {processingCount}</Badge> : null}
          {completedCount > 0 ? <Badge variant="success">已完成 {completedCount}</Badge> : null}
          {uploadFailedCount > 0 ? (
            <Badge variant="destructive">上传失败 {uploadFailedCount}</Badge>
          ) : null}
          {processingFailedCount > 0 ? (
            <Badge variant="destructive">处理失败 {processingFailedCount}</Badge>
          ) : null}
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const processingLabel = resolveProcessingLabel(item);
          const showPipeline =
            item.phase !== "upload" &&
            item.processingStatus &&
            item.processingStatus !== "ready" &&
            item.status !== "processing_failed";

          return (
            <li
              key={`${item.fileName}-${item.documentId ?? "pending"}`}
              className="rounded-control border border-border/70 px-3 py-2.5 text-sm"
            >
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{item.fileName}</span>
                <Badge variant={UPLOAD_STATUS_VARIANTS[item.status]} className="shrink-0 gap-1.5">
                  <StatusIcon status={item.status} />
                  {UPLOAD_STATUS_LABELS[item.status]}
                </Badge>
              </div>

              {item.status === "uploading" ? (
                <p className="mt-1 text-xs text-muted-foreground">正在传输文件到服务器…</p>
              ) : null}

              {item.status === "processing" && processingLabel ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  后端处理：{processingLabel}
                  {item.processingStatus ? (
                    <>
                      {" "}
                      · {DOCUMENT_STATUS_PROGRESS_HINTS[item.processingStatus]}（每{" "}
                      {DOCUMENT_POLL_INTERVAL_SECONDS} 秒轮询）
                    </>
                  ) : (
                    ""
                  )}
                </p>
              ) : null}

              {showPipeline && item.processingStatus ? (
                <div className="mt-2">
                  <DocumentPipelineStepper status={item.processingStatus} compact />
                </div>
              ) : null}

              {item.status === "completed" ? (
                <p className="mt-1 text-xs text-success">
                  已完成解析与索引，可在下方文档列表中检索。
                </p>
              ) : null}

              {item.status === "upload_error" && item.errorMessage ? (
                <p className="mt-1 text-xs text-destructive">{item.errorMessage}</p>
              ) : null}

              {item.status === "processing_failed" ? (
                <div className="mt-2">
                  <DocumentFailurePanel
                    errorCode={item.processingErrorCode}
                    errorMessage={item.processingError ?? item.errorMessage ?? null}
                    compact
                    onRetry={
                      item.documentId && onRetryProcessing
                        ? () => onRetryProcessing(item.documentId!)
                        : undefined
                    }
                  />
                </div>
              ) : null}

              {item.status === "upload_error" && onRetryUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 min-h-11 gap-1.5"
                  onClick={() => onRetryUpload(item.fileName)}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  重试上传
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function summarizeUploadQueue(items: UploadQueueItem[]) {
  return {
    queued: items.filter((item) => item.status === "queued").length,
    uploading: items.filter((item) => item.status === "uploading").length,
    processing: items.filter((item) => item.status === "processing").length,
    completed: items.filter((item) => item.status === "completed").length,
    uploadFailed: items.filter((item) => item.status === "upload_error").length,
    processingFailed: items.filter((item) => item.status === "processing_failed").length,
    active: items.some(
      (item) =>
        item.status === "queued" ||
        item.status === "uploading" ||
        item.status === "processing",
    ),
    done: items.every(
      (item) =>
        item.status === "completed" ||
        item.status === "upload_error" ||
        item.status === "processing_failed",
    ),
  };
}
