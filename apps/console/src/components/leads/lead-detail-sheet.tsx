"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Label, Sheet, SheetContent, Skeleton } from "@qiyun/ui";

import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { LeadAttachmentsSection } from "@/components/leads/lead-attachments-section";
import { LeadFollowUpTimeline } from "@/components/leads/lead-follow-up-timeline";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { formatShortDateTime } from "@/lib/leads/format";
import type { LeadDetail, LeadStatus } from "@/lib/leads/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

const textareaClassName =
  "flex min-h-[120px] w-full rounded-control border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

export interface LeadDetailSheetProps {
  open: boolean;
  lead: LeadDetail | null;
  loading?: boolean;
  errorMessage?: string | null;
  assigneeOptions: string[];
  saving?: boolean;
  saveMessage?: string | null;
  saveError?: string | null;
  readOnly?: boolean;
  readOnlyReason?: string;
  previewMode?: boolean;
  previewSaveHint?: string;
  onClose: () => void;
  onRetry?: () => void;
  onSave: (patch: { status: LeadStatus; assignee: string | null; notes: string }) => void;
}

export type LeadDetailContentProps = Omit<LeadDetailSheetProps, "open">;

export function LeadDetailContent({
  lead,
  loading = false,
  errorMessage = null,
  assigneeOptions,
  saving = false,
  saveMessage = null,
  saveError = null,
  readOnly = false,
  readOnlyReason,
  previewMode = false,
  previewSaveHint,
  onClose,
  onRetry,
  onSave,
}: LeadDetailContentProps) {
  const [status, setStatus] = useState<LeadStatus>("new");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!lead) return;
    setStatus(lead.status);
    setAssignee(lead.assignee ?? "");
    setNotes(lead.notes);
  }, [lead]);

  function handleSave() {
    onSave({
      status,
      assignee: assignee || null,
      notes,
    });
  }

  return (
    <div className="console-drawer-body overflow-y-auto">
      {loading ? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : errorMessage ? (
        <div className="p-4">
          <ConsoleRequestError message={errorMessage} onRetry={onRetry} />
        </div>
      ) : lead ? (
        <div className="space-y-4 p-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{lead.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{lead.contact}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={status} size="lg" showStrip />
              <span className="text-xs text-muted-foreground">{lead.sourceBot}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatShortDateTime(lead.createdAt)}
              </span>
            </div>
            {(assignee || lead.assignee) ? (
              <p className="mt-2 text-xs text-muted-foreground">
                负责人：
                <span className="font-medium text-card-foreground">
                  {assignee || lead.assignee}
                </span>
                {assignee !== (lead.assignee ?? "") ? (
                  <span className="text-warning"> · 变更未保存</span>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                尚未分配负责人
                {assignee ? (
                  <span className="text-warning"> · 已选 {assignee}（未保存）</span>
                ) : null}
              </p>
            )}
          </div>

          <section className="space-y-3 rounded-card border border-border bg-card p-4 text-sm shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              线索信息
            </h3>
            {lead.email ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">邮箱</span>
                <span className="text-right">{lead.email}</span>
              </div>
            ) : null}
            {lead.phone ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">电话</span>
                <span className="text-right">{lead.phone}</span>
              </div>
            ) : null}
            {lead.company ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">公司</span>
                <span className="text-right">{lead.company}</span>
              </div>
            ) : null}
            {lead.requirement ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">需求描述</span>
                <span className="max-w-[58%] text-right">{lead.requirement}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">关键问题</span>
              <span className="max-w-[58%] text-right">{lead.lastQuestion}</span>
            </div>
            {lead.sourceSiteName ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">来源站点</span>
                <span className="text-right">{lead.sourceSiteName}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">创建时间</span>
              <span>{formatShortDateTime(lead.createdAt)}</span>
            </div>
            {lead.conversationId ? (
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={`/dashboard/conversations?highlight=${encodeURIComponent(lead.conversationId)}`}>
                  查看关联会话
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/dashboard/leads/${lead.id}/follow-ups`}>查看跟进记录</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/dashboard/leads/${lead.id}`}>打开完整详情页</Link>
            </Button>
          </section>

          <LeadAttachmentsSection
            attachments={lead.attachments ?? []}
            loading={loading}
            errorMessage={errorMessage}
            successMessage={saveMessage && !saveError ? "线索详情已刷新。" : null}
            onRetry={onRetry}
          />

          {lead.summary ? (
            <section className="space-y-2 rounded-card border border-border bg-muted/30 p-4 text-sm">
              <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                AI 会话摘要
              </h3>
              <p className="leading-relaxed text-card-foreground">{lead.summary}</p>
            </section>
          ) : null}

          <LeadFollowUpTimeline
            records={lead.followUpRecords ?? []}
            loading={loading}
            errorMessage={errorMessage}
            highlightSave={Boolean(saveMessage && !saveError)}
            onRetry={onRetry}
          />

          {previewMode ? (
            <ConsoleReadOnlyNotice
              title={t(defaultLocale, "mode.notice.previewTitle")}
              description={
                previewSaveHint ?? t(defaultLocale, "leads.mode.previewSave")
              }
            />
          ) : readOnly && readOnlyReason ? (
            <ConsoleReadOnlyNotice description={readOnlyReason} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="lead-status-edit">{t(defaultLocale, "leads.detail.status")}</Label>
            <select
              id="lead-status-edit"
              className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
              value={status}
              disabled={saving || readOnly}
              onChange={(event) => setStatus(event.target.value as LeadStatus)}
            >
              <option value="new">新线索</option>
              <option value="pending">待跟进</option>
              <option value="contacted">已联系</option>
              <option value="proposal">方案中</option>
              <option value="won">已成交</option>
              <option value="invalid">无效</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-assignee-edit">{t(defaultLocale, "leads.detail.assignee")}</Label>
            <select
              id="lead-assignee-edit"
              className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
              value={assignee}
              disabled={saving || readOnly}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">未分配</option>
              {assigneeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-notes">{t(defaultLocale, "leads.detail.notes")}</Label>
            <textarea
              id="lead-notes"
              className={textareaClassName}
              value={notes}
              disabled={saving || readOnly}
              placeholder={t(defaultLocale, "leads.detail.notesPlaceholder")}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {saveMessage ? (
            <ConsoleFeedback variant="success" title={saveMessage} />
          ) : null}
          {saveError ? (
            <ConsoleRequestError
              message={saveError}
              onRetry={handleSave}
              retryLabel="重新保存"
            />
          ) : null}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={readOnly}
              className="flex-1"
            >
              {t(defaultLocale, "leads.detail.save")}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              关闭
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 text-sm text-muted-foreground">
          {t(defaultLocale, "leads.detail.empty")}
        </div>
      )}
    </div>
  );
}

export function LeadDetailSheet(props: LeadDetailSheetProps) {
  const { open, onClose, ...rest } = props;
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full max-w-[26rem] p-0 sm:max-w-md">
        <LeadDetailContent {...rest} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
