"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button, PageHeader } from "@qiyun/ui";

import { ConsoleDataModeBanner, ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { LeadDetailContent } from "@/components/leads/lead-detail-sheet";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getLeadsCapabilities } from "@/lib/leads/capabilities";
import { getAssigneeOptions, getLeadDetail, saveLeadUpdate } from "@/lib/leads/data";
import type { LeadDetail, LeadStatus } from "@/lib/leads/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export function LeadDetailPage({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getLeadDetail(leadId);
      setLead(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "线索加载失败");
    } finally {
      setLoading(false);
    }

    try {
      const opts = await getAssigneeOptions();
      setAssigneeOptions(opts);
    } catch {
      setAssigneeOptions([]);
    }

    let preview = false;
    try {
      const mode = await fetchConsoleMode();
      preview = isPreviewMode(mode);
    } catch {
      preview = true;
    }
    setPreviewMode(preview);

    try {
      const caps = await getLeadsCapabilities();
      setReadOnly(!preview && caps.canUpdate === false);
      setReadOnlyReason(caps.readOnlyReason);
    } catch {
      setReadOnly(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(patch: { status: LeadStatus; assignee: string | null; notes: string }) {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const updated = await saveLeadUpdate(leadId, patch);
      if (updated) {
        setLead(updated);
      }
      setSaveMessage(t(defaultLocale, "leads.detail.saved"));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsolePage className="flex flex-col">
      <PageHeader
        variant="compact"
        title={lead?.name ?? "线索详情"}
        description={lead ? (lead.company ?? lead.contact) : "线索跟进与详情"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleModeBadge />
            <Button variant="outline" size="sm" className="min-h-11" asChild>
              <Link href={`/dashboard/leads/${leadId}/follow-ups`}>跟进记录</Link>
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" asChild>
              <Link href="/dashboard/leads">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                返回线索列表
              </Link>
            </Button>
          </div>
        }
      />
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="线索" />
        {error ? (
          <ConsoleRequestError
            message={error}
            onRetry={() => void load()}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        ) : null}
        {readOnly && readOnlyReason ? (
          <ConsoleReadOnlyNotice description={readOnlyReason} />
        ) : null}
      </ConsolePageAlerts>
      <div className="page-section">
        <LeadDetailContent
          lead={lead}
          loading={loading}
          errorMessage={error}
          assigneeOptions={assigneeOptions}
          saving={saving}
          saveMessage={saveMessage}
          saveError={saveError}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
          previewMode={previewMode}
          onClose={() => router.push("/dashboard/leads")}
          onRetry={() => void load()}
          onSave={handleSave}
        />
      </div>
    </ConsolePage>
  );
}
