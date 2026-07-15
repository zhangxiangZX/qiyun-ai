"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, FileText, Loader2, Paperclip } from "lucide-react";

import { Badge, PanelState } from "@qiyun/ui";

import {
  formatLeadAttachmentSize,
  inferAttachmentMimeLabel,
} from "@/lib/leads/enrichment";
import { formatShortDateTime } from "@/lib/leads/format";
import type { LeadAttachment } from "@/lib/leads/types";

function resolveAttachmentStatus(attachment: LeadAttachment): {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary";
  hint: string;
} {
  if (attachment.status === "failed") {
    return {
      label: "处理失败",
      variant: "destructive",
      hint: attachment.errorMessage ?? "附件未能完成处理，请联系管理员重新上传。",
    };
  }
  if (attachment.status === "pending") {
    return {
      label: "上传中",
      variant: "warning",
      hint: "文件已收到，正在等待后台处理完成。",
    };
  }
  if (attachment.downloadUrl) {
    return {
      label: "可下载",
      variant: "success",
      hint: "点击下载查看访客上传的原始文件。",
    };
  }
  return {
    label: "暂不可下载",
    variant: "secondary",
    hint: "附件已登记，下载链接尚未生成。",
  };
}

export interface LeadAttachmentsSectionProps {
  attachments: LeadAttachment[];
  loading?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onRetry?: () => void;
}

export function LeadAttachmentsSection({
  attachments,
  loading = false,
  errorMessage = null,
  successMessage = null,
  onRetry,
}: LeadAttachmentsSectionProps) {
  const panelKind = loading
    ? "loading"
    : errorMessage
      ? "error"
      : attachments.length === 0
        ? "empty"
        : "ready";

  return (
    <section className="space-y-3 rounded-card border border-border bg-card p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            附件
          </h3>
        </div>
        {!loading && !errorMessage && attachments.length > 0 ? (
          <Badge variant="outline">{attachments.length} 个</Badge>
        ) : null}
      </div>

      <PanelState
        kind={panelKind}
        skeletonRows={2}
        errorMessage={errorMessage ?? undefined}
        onRetry={onRetry}
        emptyTitle="暂无附件"
        emptyDescription="访客在 Widget 上传的图纸或资料，处理完成后会显示在这里。"
      >
        <>
          {successMessage ? (
            <p className="rounded-control border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              {successMessage}
            </p>
          ) : null}
          <ul className="space-y-2">
          {attachments.map((attachment) => {
            const status = resolveAttachmentStatus(attachment);
            return (
              <li
                key={attachment.id}
                className="flex flex-col gap-2 rounded-control border border-border/70 bg-background/60 px-3 py-3 sm:flex-row sm:items-start"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
                      status.variant === "success"
                        ? "bg-success/10 text-success"
                        : status.variant === "warning"
                          ? "bg-warning/10 text-warning"
                          : status.variant === "destructive"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status.variant === "warning" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : status.variant === "destructive" ? (
                      <AlertCircle className="h-4 w-4" aria-hidden />
                    ) : status.variant === "success" ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    ) : (
                      <FileText className="h-4 w-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-card-foreground">{attachment.fileName}</p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {inferAttachmentMimeLabel(attachment.mimeType, attachment.fileName)}
                      {" · "}
                      {formatLeadAttachmentSize(attachment.sizeBytes)}
                      {" · "}
                      {formatShortDateTime(attachment.uploadedAt)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{status.hint}</p>
                  </div>
                </div>
                {attachment.downloadUrl && attachment.status !== "failed" ? (
                  <Link
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-control border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 sm:self-center"
                  >
                    下载
                  </Link>
                ) : null}
              </li>
            );
          })}
          </ul>
        </>
      </PanelState>
    </section>
  );
}
