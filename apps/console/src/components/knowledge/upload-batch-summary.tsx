"use client";

import { Alert } from "@qiyun/ui";

import { ConsoleFeedback } from "@/components/console/console-feedback";
import {
  summarizeUploadQueue,
  type UploadQueueItem,
} from "@/components/knowledge/upload-progress-list";
import { DOCUMENT_STATUS_POLLING_NOTE } from "@/lib/knowledge/status-labels";

export interface UploadBatchSummaryProps {
  items: UploadQueueItem[];
  onDismiss?: () => void;
}

export function UploadBatchSummary({ items, onDismiss }: UploadBatchSummaryProps) {
  if (!items.length) return null;

  const summary = summarizeUploadQueue(items);
  const total = items.length;

  if (summary.active) {
    return (
      <div className="space-y-2 rounded-control border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            批量上传进行中（共 {total} 个文件）
          </span>
          {summary.queued > 0 ? (
            <span className="text-muted-foreground">排队 {summary.queued}</span>
          ) : null}
          {summary.uploading > 0 ? (
            <span className="text-muted-foreground">上传中 {summary.uploading}</span>
          ) : null}
          {summary.processing > 0 ? (
            <span className="text-muted-foreground">处理中 {summary.processing}</span>
          ) : null}
          {summary.completed > 0 ? (
            <span className="text-success">已完成 {summary.completed}</span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{DOCUMENT_STATUS_POLLING_NOTE}</p>
      </div>
    );
  }

  if (summary.done && summary.completed > 0 && summary.uploadFailed === 0 && summary.processingFailed === 0) {
    return (
      <ConsoleFeedback
        variant="success"
        title="批量上传完成"
        message={`${summary.completed} 个文件均已完成（已接收 → 解析 → 建索引）。处理进度通过状态轮询确认，非字节级进度条。可在文档列表中检索。`}
        onDismiss={onDismiss}
      />
    );
  }

  if (summary.done && summary.completed > 0 && (summary.uploadFailed > 0 || summary.processingFailed > 0)) {
    return (
      <Alert variant="warning" title="批量上传部分完成">
        共 {total} 个文件：已完成 {summary.completed} 个
        {summary.uploadFailed > 0 ? `，上传失败 ${summary.uploadFailed} 个` : ""}
        {summary.processingFailed > 0 ? `，处理失败 ${summary.processingFailed} 个` : ""}
        。失败项可在下方单独重试；成功项已通过状态轮询确认为「已完成」。
      </Alert>
    );
  }

  if (summary.done && summary.uploadFailed > 0 && summary.completed === 0 && summary.processingFailed === 0) {
    return (
      <Alert variant="error" title="批量上传全部失败">
        {summary.uploadFailed} 个文件均未上传成功，请查看下方错误并重试。
      </Alert>
    );
  }

  if (summary.done && (summary.uploadFailed > 0 || summary.processingFailed > 0)) {
    return (
      <Alert variant="warning" title="部分文件未成功">
        {summary.completed > 0 ? `已完成 ${summary.completed} 个；` : ""}
        {summary.uploadFailed > 0 ? `上传失败 ${summary.uploadFailed} 个；` : ""}
        {summary.processingFailed > 0 ? `处理失败 ${summary.processingFailed} 个。` : ""}
        可在下方查看详情并单独重试。
      </Alert>
    );
  }

  return null;
}
