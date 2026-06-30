"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, List, MessageSquareText } from "lucide-react";

import {
  Alert,
  Button,
  EmptyState,
  PageHeader,
  Sheet,
  SheetContent,
  Skeleton,
} from "@qiyun/ui";

import { ConversationDetailPanel } from "@/components/conversations/conversation-detail-panel";
import { ConversationFiltersBar } from "@/components/conversations/conversation-filters";
import { ConversationList } from "@/components/conversations/conversation-list";
import { ConversationMessageThread } from "@/components/conversations/conversation-message-thread";
import {
  fetchConversationDetail,
  fetchConversations,
  getBotFilterOptions,
  updateConversationStatus,
  updateConversationTags,
} from "@/lib/conversations/mock-data";
import type {
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  ConversationStatus,
} from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

const defaultFilters: ConversationFilters = {
  query: "",
  botId: "all",
  hasLead: null,
  unresolvedOnly: false,
};

type LoadState = "loading" | "ready" | "error";

export function ConversationsWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [filters, setFilters] = useState<ConversationFilters>(defaultFilters);
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const botOptions = useMemo(() => getBotFilterOptions(), []);

  const loadList = useCallback(async (nextFilters: ConversationFilters) => {
    setLoadState("loading");
    try {
      const data = await fetchConversations(nextFilters);
      setItems(data);
      setLoadState("ready");
      setSelectedId((current) => {
        if (current && data.some((item) => item.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch {
      setLoadState("error");
      setItems([]);
      setSelectedId(null);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchConversationDetail(id);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(filters);
  }, [filters, loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  function handleFilterChange(patch: Partial<ConversationFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleSelectConversation(id: string) {
    setSelectedId(id);
    setMobileView("thread");
    setListSheetOpen(false);
  }

  async function handleStatusChange(status: ConversationStatus) {
    if (!selectedId) return;
    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const updated = updateConversationStatus(selectedId, status);
    if (updated) {
      setDetail(updated);
      setItems((current) =>
        current.map((item) =>
          item.id === selectedId ? { ...item, status: updated.status, updatedAt: updated.updatedAt } : item,
        ),
      );
    }
    setSaving(false);
  }

  async function handleTagsChange(tags: string[]) {
    if (!selectedId) return;
    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 200));
    const updated = updateConversationTags(selectedId, tags);
    if (updated) setDetail(updated);
    setSaving(false);
  }

  const listPanel = (
    <>
      <ConversationFiltersBar
        filters={filters}
        botOptions={botOptions}
        onChange={handleFilterChange}
      />
      {loadState === "loading" ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <ConversationList
          items={items}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
        />
      )}
    </>
  );

  const threadPanel = (
    <ConversationMessageThread conversation={detail} loading={detailLoading} />
  );

  const detailPanel = (
    <ConversationDetailPanel
      conversation={detail}
      loading={detailLoading}
      saving={saving}
      onStatusChange={(status) => void handleStatusChange(status)}
      onTagsChange={(tags) => void handleTagsChange(tags)}
    />
  );

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "conversations.title")}
          description={t(defaultLocale, "conversations.description")}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <Alert variant="error" title={t(defaultLocale, "conversations.error.load")} />
          <Button variant="outline" size="sm" onClick={() => void loadList(filters)}>
            {t(defaultLocale, "dashboard.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (loadState === "ready" && !items.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "conversations.title")}
          description={t(defaultLocale, "conversations.description")}
        />
        <div className="px-4 sm:px-6 lg:px-page">
          <EmptyState
            icon={<MessageSquareText className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "conversations.empty.title")}
            description={t(defaultLocale, "conversations.empty.description")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t(defaultLocale, "conversations.title")}
        description={t(defaultLocale, "conversations.description")}
      />

      <div className="-mx-4 flex min-h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-card border border-border bg-card shadow-card sm:-mx-6 lg:mx-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
          {mobileView === "thread" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setListSheetOpen(true)}>
                <List className="h-4 w-4" aria-hidden />
                会话列表
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMobileView("list")}>
                返回
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setDetailSheetOpen(true)}
              >
                <Info className="h-4 w-4" aria-hidden />
                详情
              </Button>
            </>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">选择会话查看消息与详情</p>
          )}
        </div>

        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_300px]">
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

          <aside className="hidden min-h-0 overflow-y-auto border-l border-border lg:col-start-3 lg:block">
            {detailPanel}
          </aside>
        </div>
      </div>

      <Sheet open={listSheetOpen} onOpenChange={setListSheetOpen}>
        <SheetContent side="left" className="w-[min(100vw,20rem)] p-0">
          <div className="flex h-full flex-col overflow-y-auto pt-10">{listPanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-[min(100vw,20rem)] p-0">
          <div className="h-full overflow-y-auto pt-10">{detailPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
