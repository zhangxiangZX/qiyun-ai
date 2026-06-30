"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, Button, Label, Sheet, SheetContent } from "@qiyun/ui";

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
  assigneeOptions: string[];
  saving?: boolean;
  saveMessage?: string | null;
  onClose: () => void;
  onSave: (patch: { status: LeadStatus; assignee: string | null; notes: string }) => void;
}

export function LeadDetailSheet({
  open,
  lead,
  assigneeOptions,
  saving = false,
  saveMessage = null,
  onClose,
  onSave,
}: LeadDetailSheetProps) {
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
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-[min(100vw,24rem)] p-0">
        <div className="flex h-full flex-col overflow-y-auto pt-10">
          {lead ? (
            <div className="space-y-4 p-4">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">{lead.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{lead.contact}</p>
                <div className="mt-3">
                  <LeadStatusBadge status={lead.status} />
                </div>
              </div>

              <section className="space-y-2 rounded-card border border-border bg-card p-4 text-sm shadow-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">来源机器人</span>
                  <span className="text-right font-medium">{lead.sourceBot}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">最近问题</span>
                  <span className="max-w-[60%] text-right">{lead.lastQuestion}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">创建时间</span>
                  <span>{formatShortDateTime(lead.createdAt)}</span>
                </div>
                {lead.conversationId ? (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/conversations`}>
                        查看关联会话
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </section>

              <div className="space-y-2">
                <Label htmlFor="lead-status-edit">{t(defaultLocale, "leads.detail.status")}</Label>
                <select
                  id="lead-status-edit"
                  className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
                  value={status}
                  disabled={saving}
                  onChange={(event) => setStatus(event.target.value as LeadStatus)}
                >
                  <option value="new">新建</option>
                  <option value="following">跟进中</option>
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
                  disabled={saving}
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
                  disabled={saving}
                  placeholder={t(defaultLocale, "leads.detail.notesPlaceholder")}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              {saveMessage ? <Alert variant="success" title={saveMessage} /> : null}

              <div className="flex gap-2">
                <Button onClick={handleSave} loading={saving} className="flex-1">
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
      </SheetContent>
    </Sheet>
  );
}
