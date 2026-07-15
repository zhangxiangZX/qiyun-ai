"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Alert, Button, PageHeader, Sheet, SheetContent } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
} from "@/components/console/console-page-shell";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { ConversationDetailPanel } from "@/components/conversations/conversation-detail-panel";
import { ConversationFollowUpBar } from "@/components/conversations/conversation-follow-up-bar";
import { ConversationMessageThread } from "@/components/conversations/conversation-message-thread";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getSaveSuccessMessage } from "@/lib/console/mode-copy";
import {
  CONVERSATIONS_METADATA_PERSISTENT,
  getConversationDetail,
  updateConversationStatus,
  updateConversationTags,
} from "@/lib/conversations/data";
import type { ConversationDetail, ConversationStatus } from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

type LoadState = "loading" | "ready" | "error";

export function ConversationDetailPage({ conversationId }: { conversationId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [metadataNotice, setMetadataNotice] = useState<string | null>(null);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<boolean | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const editingDisabled =
    previewMode !== false || !CONVERSATIONS_METADATA_PERSISTENT;
  const editingDisabledReason = (() => {
    if (previewMode === true) {
      return t(defaultLocale, "conversations.mode.previewEditDisabled");
    }
    if (!CONVERSATIONS_METADATA_PERSISTENT) {
      return t(defaultLocale, "conversations.mode.metadataUnavailable");
    }
    return undefined;
  })();

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setPreviewMode(isPreviewMode(info)))
      .catch(() => setPreviewMode(true));
  }, []);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getConversationDetail(conversationId);
      setDetail(data);
      setLoadState("ready");
    } catch {
      setDetail(null);
      setDetailError(t(defaultLocale, "conversations.error.detail"));
      setLoadState("error");
    } finally {
      setDetailLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useOnWorkspaceChanged(() => {
    void loadDetail();
  });

  async function handleStatusChange(status: ConversationStatus) {
    if (!detail) return;

    const previousStatus = detail.status;
    setDetail({ ...detail, status });

    if (editingDisabled) {
      setMetadataNotice(
        previewMode === true
          ? t(defaultLocale, "conversations.mode.previewEditDisabled")
          : t(defaultLocale, "conversations.mode.metadataUnavailable"),
      );
      return;
    }

    setMetadataSaving(true);
    setMetadataNotice(null);

    try {
      const updated = await updateConversationStatus(detail.id, status);
      setDetail(updated);
      setMetadataNotice(getSaveSuccessMessage("upstream", "conversationStatus"));
    } catch (error) {
      setDetail({ ...detail, status: previousStatus });
      setMetadataNotice(
        error instanceof Error ? error.message : "状态保存失败，请重试。",
      );
    } finally {
      setMetadataSaving(false);
    }
  }

  async function handleTagsChange(tags: string[]) {
    if (!detail) return;

    const previousTags = detail.tags;
    setDetail({ ...detail, tags });

    if (editingDisabled) {
      setMetadataNotice(
        previewMode === true
          ? t(defaultLocale, "conversations.mode.previewEditDisabled")
          : t(defaultLocale, "conversations.mode.metadataUnavailable"),
      );
      return;
    }

    setMetadataSaving(true);
    setMetadataNotice(null);

    try {
      const updated = await updateConversationTags(detail.id, tags);
      setDetail(updated);
      setMetadataNotice(getSaveSuccessMessage("upstream", "conversationTags"));
    } catch (error) {
      setDetail({ ...detail, tags: previousTags });
      setMetadataNotice(
        error instanceof Error ? error.message : "标签保存失败，请重试。",
      );
    } finally {
      setMetadataSaving(false);
    }
  }

  if (loadState === "error") {
    return (
      <ConsolePage>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "conversations.detail.title")}
          description={t(defaultLocale, "conversations.description")}
          actions={
            <Button variant="outline" size="sm" className="min-h-11" asChild>
              <Link href="/dashboard/conversations">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                返回会话列表
              </Link>
            </Button>
          }
        />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="会话" />
          <ConsoleRequestError
            message={detailError ?? t(defaultLocale, "conversations.error.detail")}
            onRetry={() => void loadDetail()}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  const threadConversation = detailLoading ? null : detail;

  return (
    <ConsolePage className="flex flex-col">
      <PageHeader
        variant="compact"
        title={detail?.visitorLabel ?? t(defaultLocale, "conversations.detail.title")}
        description={
          detail
            ? `${detail.botName} · ${detail.channel}`
            : t(defaultLocale, "conversations.description")
        }
        actions={
          <div className="flex items-center gap-2">
            <ConsoleModeBadge />
            <Button variant="outline" size="sm" className="min-h-11" asChild>
              <Link href="/dashboard/conversations">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                返回会话列表
              </Link>
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="会话" />
        {previewMode === true ? (
          <ConsoleReadOnlyNotice
            title={t(defaultLocale, "conversations.mode.previewReadonlyTitle")}
            description={t(defaultLocale, "conversations.mode.previewReadonlyDescription")}
          />
        ) : null}
        {previewMode === false && !CONVERSATIONS_METADATA_PERSISTENT ? (
          <ConsoleReadOnlyNotice
            title={t(defaultLocale, "conversations.mode.upstreamReadonly")}
            description={t(defaultLocale, "conversations.mode.metadataUnavailable")}
          />
        ) : null}
        {metadataNotice ? (
          <Alert
            variant={metadataNotice.includes("失败") ? "error" : "info"}
            title={metadataNotice}
          />
        ) : null}
      </ConsolePageAlerts>

      <div className="grid min-h-[70vh] flex-1 grid-cols-1 gap-3 lg:h-[calc(100vh-9rem)] lg:grid-cols-[1fr_24rem]">
        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-card border border-border lg:min-h-0">
          {detail ? (
            <ConversationFollowUpBar
              listItem={detail}
              detail={detail}
              saving={metadataSaving}
              editingDisabled={editingDisabled}
              onStatusChange={handleStatusChange}
              onOpenDetail={() => setDetailSheetOpen(true)}
            />
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ConversationMessageThread
              conversation={threadConversation}
              loading={detailLoading}
              errorMessage={detailError}
              emptyMessage={t(defaultLocale, "conversations.selection.threadEmpty")}
            />
          </div>
        </section>

        <aside className="overflow-y-auto rounded-card border border-border lg:min-h-0">
          <ConversationDetailPanel
            conversation={detail}
            loading={detailLoading}
            saving={metadataSaving}
            editingDisabled={editingDisabled}
            editingDisabledReason={editingDisabledReason}
            metadataNotice={metadataNotice}
            onStatusChange={handleStatusChange}
            onTagsChange={handleTagsChange}
          />
        </aside>
      </div>

      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-[min(100vw,28rem)] p-0">
          <div className="console-drawer-body">
            <ConversationDetailPanel
              conversation={detail}
              loading={detailLoading}
              saving={metadataSaving}
              editingDisabled={editingDisabled}
              editingDisabledReason={editingDisabledReason}
              metadataNotice={metadataNotice}
              onStatusChange={handleStatusChange}
              onTagsChange={handleTagsChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    </ConsolePage>
  );
}
