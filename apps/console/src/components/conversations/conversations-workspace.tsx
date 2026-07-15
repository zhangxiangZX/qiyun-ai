"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Info, List } from "lucide-react";

import {
  Alert,
  Button,
  ConfirmDialog,
  PageHeader,
  Sheet,
  SheetContent,
  Skeleton,
  StatCard,
} from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import {
  ConsolePage,
  ConsolePageAlerts,
} from "@/components/console/console-page-shell";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { ConversationDetailPanel } from "@/components/conversations/conversation-detail-panel";
import { ConversationFollowUpBar } from "@/components/conversations/conversation-follow-up-bar";
import { ConversationFiltersBar } from "@/components/conversations/conversation-filters";
import { ConversationList } from "@/components/conversations/conversation-list";
import { ConversationMessageThread } from "@/components/conversations/conversation-message-thread";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getSaveSuccessMessage } from "@/lib/console/mode-copy";
import {
  CONVERSATIONS_METADATA_PERSISTENT,
  applyConversationFilters,
  getConversationDetail,
  listBotFilterOptions,
  listConversationsPage,
  updateConversationStatus,
  updateConversationTags,
} from "@/lib/conversations/data";
import { getConversationsCapabilities } from "@/lib/conversations/capabilities";
import type {
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  ConversationStatus,
} from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

const defaultFilters: ConversationFilters = {
  query: "",
  botId: "all",
  hasLead: null,
  unresolvedOnly: false,
};

const PAGE_SIZE = 20;

type LoadState = "loading" | "ready" | "error";

export function ConversationsWorkspace() {
  const searchParams = useSearchParams();
  const highlightFromUrl = searchParams.get("highlight");
  const handledHighlightRef = useRef<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>(defaultFilters);
  const [allItems, setAllItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [metadataNotice, setMetadataNotice] = useState<string | null>(null);
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [previewMode, setPreviewMode] = useState<boolean | null>(null);
  const [botOptions, setBotOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const [listLoadMoreError, setListLoadMoreError] = useState<string | null>(null);
  const [filterHint, setFilterHint] = useState<string | null>(null);
  const [serverFiltersEnabled, setServerFiltersEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmResolveAllOpen, setConfirmResolveAllOpen] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResultSummary, setBulkResultSummary] = useState<string | null>(null);

  const items = useMemo(() => {
    if (serverFiltersEnabled) {
      return allItems;
    }
    return applyConversationFilters(allItems, filters);
  }, [allItems, filters, serverFiltersEnabled]);

  const unresolvedCount = items.filter((item) => item.status === "unresolved").length;
  const leadCount = items.filter((item) => item.hasLead).length;
  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    filters.botId !== "all" ||
    filters.hasLead === true ||
    filters.unresolvedOnly;
  const selectedInFilteredList = selectedId
    ? items.some((item) => item.id === selectedId)
    : false;
  const pinnedItem =
    selectedId && !selectedInFilteredList
      ? (allItems.find((item) => item.id === selectedId) ?? null)
      : null;
  const selectedListItem = selectedId
    ? (allItems.find((item) => item.id === selectedId) ?? pinnedItem)
    : null;
  const highlightActive = Boolean(highlightFromUrl && selectedId === highlightFromUrl);
  const threadStale = Boolean(selectedId && detail?.id !== selectedId);
  const threadLoading = detailLoading || threadStale;
  const threadConversation = threadStale ? null : detail;

  function formatPaginationMessage(template: string) {
    return template
      .replace("{loaded}", String(allItems.length))
      .replace("{filtered}", String(items.length));
  }

  const editingDisabled =
    previewMode !== false || !CONVERSATIONS_METADATA_PERSISTENT;
  const editingDisabledReason = useMemo(() => {
    if (previewMode === true) {
      return t(defaultLocale, "conversations.mode.previewEditDisabled");
    }
    if (!CONVERSATIONS_METADATA_PERSISTENT) {
      return t(defaultLocale, "conversations.mode.metadataUnavailable");
    }
    return undefined;
  }, [previewMode]);

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setPreviewMode(isPreviewMode(info)))
      .catch(() => setPreviewMode(true));
    void getConversationsCapabilities()
      .then((capabilities) => {
        setFilterHint(capabilities.clientFilterHint);
        setServerFiltersEnabled(capabilities.serverFiltersEnabled);
      })
      .catch(() => {
        setFilterHint(null);
        setServerFiltersEnabled(false);
      });
  }, []);

  useEffect(() => {
    void listBotFilterOptions()
      .then(setBotOptions)
      .catch(() => setBotOptions([]));
  }, [previewMode]);

  const loadList = useCallback(async () => {
    setLoadState("loading");
    setListError(null);
    setListLoadMoreError(null);
    setMetadataNotice(null);

    try {
      const page = await listConversationsPage({
        limit: PAGE_SIZE,
        filters,
        serverFilters: serverFiltersEnabled,
      });
      setAllItems(page.items);
      setNextCursor(page.nextCursor);
      setLoadState("ready");
      setSelectedId((current) => {
        if (current) {
          return current;
        }
        return page.items[0]?.id ?? null;
      });
    } catch (error) {
      setListError(
        getApiErrorMessage(error, t(defaultLocale, "conversations.error.load")),
      );
      setLoadState("error");
      setAllItems([]);
      setNextCursor(null);
      setSelectedId(null);
    }
  }, [filters, serverFiltersEnabled]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || listLoadingMore) {
      return;
    }

    setListLoadingMore(true);
    setListLoadMoreError(null);
    try {
      const page = await listConversationsPage({
        limit: PAGE_SIZE,
        cursor: nextCursor,
        filters,
        serverFilters: serverFiltersEnabled,
      });
      setAllItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setListLoadMoreError(
        getApiErrorMessage(error, t(defaultLocale, "conversations.pagination.loadMoreError")),
      );
    } finally {
      setListLoadingMore(false);
    }
  }, [filters, listLoadingMore, nextCursor, serverFiltersEnabled]);

  useOnWorkspaceChanged(() => {
    setSelectedId(null);
    setFilters(defaultFilters);
    void loadList();
    void listBotFilterOptions()
      .then(setBotOptions)
      .catch(() => setBotOptions([]));
  });

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getConversationDetail(id);
      setDetail(data);
    } catch {
      setDetail(null);
      setDetailError(t(defaultLocale, "conversations.error.detail"));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetail(null);
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!highlightFromUrl || loadState !== "ready") {
      return;
    }
    if (handledHighlightRef.current === highlightFromUrl) {
      return;
    }
    handledHighlightRef.current = highlightFromUrl;
    setSelectedId(highlightFromUrl);
    setMobileView("thread");
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    setDetailSheetOpen(!isDesktop);
    window.setTimeout(() => {
      document
        .getElementById(`conversation-row-${highlightFromUrl}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (isDesktop) {
        document
          .getElementById("conversation-detail-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 120);
  }, [highlightFromUrl, loadState]);

  function handleFilterChange(patch: Partial<ConversationFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    if (serverFiltersEnabled) {
      setSelectedId(null);
    }
  }

  function handleSelectConversation(id: string) {
    setSelectedId(id);
    setMobileView("thread");
    setListSheetOpen(false);
    setMetadataNotice(null);
  }

  async function handleStatusChange(status: ConversationStatus) {
    if (!detail) return;

    const previousStatus = detail.status;
    setDetail({ ...detail, status });
    setAllItems((current) =>
      current.map((item) => (item.id === detail.id ? { ...item, status } : item)),
    );

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
      setAllItems((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item,
        ),
      );
      setMetadataNotice(getSaveSuccessMessage("upstream", "conversationStatus"));
    } catch (error) {
      setDetail({ ...detail, status: previousStatus });
      setAllItems((current) =>
        current.map((item) =>
          item.id === detail.id ? { ...item, status: previousStatus } : item,
        ),
      );
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

  const unresolvedItemIds = useMemo(
    () => items.filter((item) => item.status !== "resolved").map((item) => item.id),
    [items],
  );

  function toggleSelectConversation(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllConversations() {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }

  async function resolveConversationIds(ids: string[]) {
    if (!ids.length) return;
    if (editingDisabled) {
      setMetadataNotice(
        previewMode === true
          ? t(defaultLocale, "conversations.mode.previewEditDisabled")
          : t(defaultLocale, "conversations.mode.metadataUnavailable"),
      );
      return;
    }
    setBulkBusy(true);
    setBulkError(null);
    setBulkResultSummary(null);
    const failed: string[] = [];
    for (const id of ids) {
      try {
        const updated = await updateConversationStatus(id, "resolved");
        setAllItems((current) =>
          current.map((item) =>
            item.id === updated.id ? { ...item, status: updated.status } : item,
          ),
        );
        setDetail((current) => (current && current.id === id ? updated : current));
      } catch {
        failed.push(id);
      }
    }
    setBulkBusy(false);
    setSelectedIds(new Set());
    if (failed.length === 0) {
      setBulkResultSummary(`已成功解决 ${ids.length} 个会话`);
    } else {
      setBulkError(
        `已解决 ${ids.length - failed.length}/${ids.length} 个会话，部分失败，请稍后重试。`,
      );
    }
  }

  const listPanel = (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => setConfirmResolveAllOpen(true)}
          disabled={editingDisabled || unresolvedItemIds.length === 0}
          title={editingDisabled ? "当前为只读/预览模式，无法修改" : undefined}
        >
          全部解决
        </Button>
        {selectedIds.size < items.length ? (
          <Button variant="ghost" size="sm" className="min-h-11" onClick={selectAllConversations}>
            全选
          </Button>
        ) : null}
        {selectedIds.size > 0 ? (
          <>
            <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 项</span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setConfirmBulkOpen(true)}
              disabled={editingDisabled}
            >
              标记已解决
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => setSelectedIds(new Set())}
            >
              取消
            </Button>
          </>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-3 border-b border-border px-4 py-3">
        <ConversationMiniStat
          label={t(defaultLocale, "conversations.stats.current")}
          value={String(items.length)}
        />
        <ConversationMiniStat
          label={t(defaultLocale, "conversations.stats.unresolved")}
          value={String(unresolvedCount)}
        />
        <ConversationMiniStat
          label={t(defaultLocale, "conversations.stats.leads")}
          value={String(leadCount)}
        />
      </div>
      <ConversationFiltersBar
        filters={filters}
        botOptions={botOptions}
        onChange={handleFilterChange}
        hasActiveFilters={hasActiveFilters}
        onReset={() => setFilters(defaultFilters)}
        filterHint={filterHint ?? undefined}
      />
      {loadState === "loading" ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <ConversationList
            items={items}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectConversation}
            filteredEmpty={hasActiveFilters}
            onResetFilters={() => setFilters(defaultFilters)}
            pinnedItem={pinnedItem}
            pinnedLabel={t(defaultLocale, "conversations.selection.pinnedLabel")}
          />
          {hasActiveFilters && nextCursor ? (
            <p className="border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
              {t(defaultLocale, "conversations.pagination.filterMayHide")}
            </p>
          ) : null}
          {nextCursor ? (
            <div className="space-y-2 border-t border-border px-4 py-3">
              <p className="text-center text-xs text-muted-foreground">
                {formatPaginationMessage(
                  hasActiveFilters
                    ? t(defaultLocale, "conversations.pagination.loadedFiltered")
                    : t(defaultLocale, "conversations.pagination.loaded"),
                )}
              </p>
              <Button
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => void loadMore()}
                loading={listLoadingMore}
              >
                {t(defaultLocale, "conversations.pagination.loadMore")}
              </Button>
            </div>
          ) : allItems.length > 0 ? (
            <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
              {formatPaginationMessage(
                hasActiveFilters
                  ? t(defaultLocale, "conversations.pagination.loadedFiltered")
                  : t(defaultLocale, "conversations.pagination.allLoaded"),
              )}
            </p>
          ) : null}
        </>
      )}
    </>
  );

  function handleOpenDetailPanel() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      document
        .getElementById("conversation-detail-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    setDetailSheetOpen(true);
  }

  const threadPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {selectedListItem ? (
        <ConversationFollowUpBar
          listItem={selectedListItem}
          detail={detail}
          highlightMode={highlightActive}
          saving={metadataSaving}
          editingDisabled={editingDisabled}
          onStatusChange={handleStatusChange}
          onOpenDetail={handleOpenDetailPanel}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ConversationMessageThread
          conversation={threadConversation}
          loading={threadLoading}
          errorMessage={detailError}
          emptyMessage={t(defaultLocale, "conversations.selection.threadEmpty")}
        />
      </div>
    </div>
  );

  const detailPanel = (
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
  );

  if (loadState === "error") {
    return (
      <ConsolePage>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "conversations.title")}
          description={t(defaultLocale, "conversations.description")}
          actions={<ConsoleModeBadge />}
        />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="会话" />
          <ConsoleRequestError
            message={listError ?? t(defaultLocale, "conversations.error.load")}
            onRetry={() => void loadList()}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  if (loadState === "ready" && !allItems.length) {
    return (
      <ConsolePage>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "conversations.title")}
          description={t(defaultLocale, "conversations.description")}
          actions={<ConsoleModeBadge />}
        />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="会话" />
          <ConsoleEmptyState
            preset="noConversations"
            title={t(defaultLocale, "conversations.empty.title")}
            description={
              previewMode === true
                ? t(defaultLocale, "conversations.mode.previewEmptyDescription")
                : t(defaultLocale, "conversations.empty.description")
            }
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage className="space-y-4">
      <PageHeader
        variant="compact"
        title={t(defaultLocale, "conversations.title")}
        description={t(defaultLocale, "conversations.description")}
        actions={<ConsoleModeBadge />}
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
        {selectedId && !selectedInFilteredList && hasActiveFilters ? (
          <div className="space-y-2">
            <Alert variant="info" title={t(defaultLocale, "conversations.selection.hiddenByFilter")} />
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setFilters(defaultFilters)}
            >
              {t(defaultLocale, "conversations.filters.reset")}
            </Button>
          </div>
        ) : null}
        {listLoadMoreError ? (
          <ConsoleRequestError
            message={listLoadMoreError}
            onRetry={() => void loadMore()}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        ) : null}
        {detailError ? (
          <ConsoleRequestError
            message={t(defaultLocale, "conversations.selection.detailLoadError")}
            onRetry={selectedId ? () => void loadDetail(selectedId) : undefined}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        ) : null}
        {metadataNotice ? (
          <Alert
            variant={metadataNotice.includes("失败") ? "error" : "info"}
            title={metadataNotice}
          />
        ) : null}
        {bulkResultSummary ? (
          <Alert variant="success" title={bulkResultSummary} />
        ) : null}
        {bulkError ? (
          <Alert variant="error" title={bulkError} />
        ) : null}
      </ConsolePageAlerts>

      {loadState === "ready" ? (
        <div className="grid gap-3 md:grid-cols-3 ui-stagger-fade-in ui-hover-lift-children">
          <StatCard
            emphasis="metric"
            label={t(defaultLocale, "conversations.stats.filteredTitle")}
            value={`${items.length} 条`}
            description={t(defaultLocale, "conversations.stats.filteredDescription")}
          />
          <StatCard
            emphasis="metric"
            label={t(defaultLocale, "conversations.stats.followUpTitle")}
            value={`${unresolvedCount} 条`}
            description={t(defaultLocale, "conversations.stats.followUpDescription")}
            tone={unresolvedCount ? "warning" : "default"}
          />
          <StatCard
            emphasis="metric"
            label={t(defaultLocale, "conversations.stats.leadsTitle")}
            value={`${leadCount} 条`}
            description={t(defaultLocale, "conversations.stats.leadsDescription")}
          />
        </div>
      ) : null}

      <div className="console-workspace-shell">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
          {mobileView === "thread" ? (
            <>
              <Button variant="outline" size="sm" className="min-h-11" onClick={() => setListSheetOpen(true)}>
                <List className="h-4 w-4" aria-hidden />
                {t(defaultLocale, "conversations.mobile.list")}
              </Button>
              <Button variant="outline" size="sm" className="min-h-11" onClick={() => {
                setMobileView("list");
                setListSheetOpen(false);
                setDetailSheetOpen(false);
              }}>
                {t(defaultLocale, "conversations.mobile.back")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto min-h-11"
                onClick={() => setDetailSheetOpen(true)}
              >
                <Info className="h-4 w-4" aria-hidden />
                {t(defaultLocale, "conversations.mobile.detail")}
              </Button>
            </>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">
              {t(defaultLocale, "conversations.mobile.hint")}
            </p>
          )}
        </div>

        <div className="console-workspace-grid min-h-0 flex-1">
          <aside className="hidden min-h-0 flex-col overflow-y-auto border-r border-border lg:flex">
            {listPanel}
          </aside>

          {mobileView === "list" ? (
            <section className="min-h-0 overflow-y-auto lg:hidden">{listPanel}</section>
          ) : null}

          {mobileView === "thread" ? (
            <section className="min-h-0 overflow-hidden lg:col-start-2 lg:row-start-1">
              {threadPanel}
            </section>
          ) : (
            <section className="hidden min-h-0 overflow-hidden lg:col-start-2 lg:block">
              {threadPanel}
            </section>
          )}

          <aside
            id="conversation-detail-panel"
            className="hidden min-h-0 overflow-y-auto border-l border-border lg:col-start-3 lg:block"
          >
            {detailPanel}
          </aside>
        </div>
      </div>

      <Sheet open={listSheetOpen} onOpenChange={setListSheetOpen}>
        <SheetContent side="left" className="w-[min(100vw,20rem)] p-0">
          <div className="console-drawer-body">{listPanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-[min(100vw,28rem)] p-0">
          <div className="console-drawer-body">{detailPanel}</div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmResolveAllOpen}
        title="全部解决会话？"
        description={`将把当前列表中的 ${unresolvedItemIds.length} 个待处理会话标记为「已解决」。此操作不可撤销。`}
        confirmLabel="全部解决"
        cancelLabel="取消"
        confirmLoading={bulkBusy}
        onConfirm={() => {
          setConfirmResolveAllOpen(false);
          void resolveConversationIds(unresolvedItemIds);
        }}
        onCancel={() => setConfirmResolveAllOpen(false)}
      />
      <ConfirmDialog
        open={confirmBulkOpen}
        title="标记选中会话为已解决？"
        description={`将把选中的 ${selectedIds.size} 个会话标记为「已解决」。`}
        confirmLabel="标记已解决"
        cancelLabel="取消"
        confirmLoading={bulkBusy}
        onConfirm={() => {
          setConfirmBulkOpen(false);
          void resolveConversationIds([...selectedIds]);
        }}
        onCancel={() => setConfirmBulkOpen(false)}
      />
    </ConsolePage>
  );
}

function ConversationMiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-control bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
