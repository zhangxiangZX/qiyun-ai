"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button, PageHeader, Skeleton } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
} from "@/components/console/console-page-shell";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { LeadAttachmentsSection } from "@/components/leads/lead-attachments-section";
import { LeadFollowUpTimeline } from "@/components/leads/lead-follow-up-timeline";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getLeadsCapabilities } from "@/lib/leads/capabilities";
import { getLeadDetail } from "@/lib/leads/data";
import { formatShortDateTime } from "@/lib/leads/format";
import type { LeadDetail } from "@/lib/leads/types";

export function FollowUpDetailWorkspace({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | undefined>();
  const [previewMode, setPreviewMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let preview = true;
    try {
      const mode = await fetchConsoleMode();
      preview = isPreviewMode(mode);
      setPreviewMode(preview);
    } catch {
      setPreviewMode(true);
    }

    try {
      const caps = await getLeadsCapabilities();
      setReadOnly(!preview && caps.canUpdate === false);
      setReadOnlyReason(caps.readOnlyReason);
    } catch {
      setReadOnly(false);
    }

    try {
      const detail = await getLeadDetail(leadId);
      if (!detail) {
        setError(new Error("未找到该线索。"));
        setLead(null);
        return;
      }
      setLead(detail);
    } catch (nextError) {
      setError(nextError);
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="跟进记录" />
        {previewMode ? (
          <ConsoleReadOnlyNotice
            title="预览模式"
            description="跟进记录来自演示数据；配置上游 API 后将展示真实线索跟进轨迹。"
          />
        ) : null}
        {readOnly && readOnlyReason ? (
          <ConsoleReadOnlyNotice description={readOnlyReason} />
        ) : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        title={lead?.name ?? "跟进记录详情"}
        description={lead ? `${lead.company ?? lead.contact} · 线索跟进轨迹` : "加载中"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/inquiries">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                询盘中心
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tasks">跟进任务</Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-card" />
        ) : error ? (
          <ConsoleRequestError
            {...resolveRequestErrorPresentation(error, "跟进记录加载失败。")}
            onRetry={() => void load()}
          />
        ) : lead ? (
          <>
            <section className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <LeadStatusBadge status={lead.status} size="lg" showStrip />
                <span className="text-sm text-muted-foreground">{lead.sourceBot}</span>
                <span className="text-xs text-muted-foreground">
                  创建 {formatShortDateTime(lead.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{lead.lastQuestion}</p>
              {lead.conversationId ? (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href={`/dashboard/conversations/${lead.conversationId}`}>
                    查看关联会话
                  </Link>
                </Button>
              ) : null}
            </section>

            <LeadFollowUpTimeline
              records={lead.followUpRecords ?? []}
              onRetry={() => void load()}
            />

            <LeadAttachmentsSection
              attachments={lead.attachments ?? []}
              onRetry={() => void load()}
            />
          </>
        ) : null}
      </div>
    </ConsolePage>
  );
}
