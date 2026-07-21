"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Filter, Plus, Star, UserRound } from "lucide-react";

import { Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { ConsoleDataModeBanner, ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import {
  ConsolePage,
  ConsolePageAlerts,
} from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";
import { LeadFiltersBar } from "@/components/leads/lead-filters";
import { LeadTable } from "@/components/leads/lead-table";
import { getApiErrorMessage } from "@/lib/api/errors";
import { exportLeadsToCsv } from "@/lib/leads/export";
import { getSaveSuccessMessage } from "@/lib/console/mode-copy";
import {
  applyLeadFilters,
  createLead as createLeadEntry,
  getAssigneeOptions,
  getLeadDetail,
  getLeadsCapabilities,
  listAllLeads,
  loadBotFilterOptions,
  resolveLeadsForExport,
  saveLeadUpdate,
  type LeadsCapabilities,
} from "@/lib/leads/data";
import type { LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "@/lib/leads/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

const defaultFilters: LeadFilters = {
  query: "",
  status: "all",
  botId: "all",
  assignee: "all",
};

type LoadState = "loading" | "ready" | "error";

export function LeadsWorkspace() {
  const searchParams = useSearchParams();
  const highlightFromUrl = searchParams.get("highlight");
  const handledHighlightRef = useRef<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<LeadsCapabilities | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
  const [allItems, setAllItems] = useState<LeadListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [botOptions, setBotOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [createdLeads, setCreatedLeads] = useState<LeadListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", contact: "", sourceBot: "", lastQuestion: "" });
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const displayItems = useMemo(() => [...createdLeads, ...allItems], [createdLeads, allItems]);
  const items = useMemo(() => applyLeadFilters(displayItems, filters), [displayItems, filters]);
  const assigneeOptions = useMemo(() => getAssigneeOptions(), []);
  const followingCount = items.filter(
    (item) =>
      item.status === "pending" || item.status === "contacted" || item.status === "proposal",
  ).length;
  const wonCount = items.filter((item) => item.status === "won").length;
  const unassignedCount = items.filter((item) => !item.assignee).length;
  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    filters.status !== "all" ||
    filters.botId !== "all" ||
    filters.assignee !== "all";
  const readOnly = capabilities?.dataMode === "upstream" && !capabilities.canUpdate;

  const loadCapabilities = useCallback(async () => {
    const next = await getLeadsCapabilities();
    setCapabilities(next);
    return next;
  }, []);

  const loadList = useCallback(async () => {
    setLoadState("loading");
    setListError(null);
    try {
      await loadCapabilities();
      const data = await listAllLeads();
      setAllItems(data);
      setLoadState("ready");
    } catch (error) {
      setListError(getApiErrorMessage(error, t(defaultLocale, "leads.error.load")));
      setLoadState("error");
      setAllItems([]);
    }
  }, [loadCapabilities]);

  useOnWorkspaceChanged(() => {
    void loadList();
    void loadBotFilterOptions().then(setBotOptions).catch(() => setBotOptions([]));
  });

  useEffect(() => {
    void loadList();
    void loadBotFilterOptions().then(setBotOptions).catch(() => setBotOptions([]));
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getLeadDetail(id);
      if (!data) {
        setDetail(null);
        setDetailError("未找到该线索，可能已被删除。");
        return;
      }
      setDetail(data);
    } catch (error) {
      setDetail(null);
      setDetailError(getApiErrorMessage(error, "线索详情加载失败，请重试。"));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId || !sheetOpen) return;
    void loadDetail(selectedId);
  }, [selectedId, sheetOpen, loadDetail]);

  useEffect(() => {
    if (!highlightFromUrl || loadState !== "ready") {
      return;
    }
    if (handledHighlightRef.current === highlightFromUrl) {
      return;
    }
    handledHighlightRef.current = highlightFromUrl;
    setSelectedId(highlightFromUrl);
    setSheetOpen(true);
    setSaveMessage(null);
    setSaveError(null);
  }, [highlightFromUrl, loadState]);

  function handleSelectLead(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
    setSaveMessage(null);
    setSaveError(null);
  }

  function handleCloseSheet() {
    setSheetOpen(false);
    setSaveMessage(null);
    setSaveError(null);
    setDetailError(null);
  }

  async function handleSave(patch: {
    status: LeadStatus;
    assignee: string | null;
    notes: string;
  }) {
    if (!selectedId || readOnly) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const updated = await saveLeadUpdate(selectedId, patch);
      if (!updated) {
        setSaveError("保存失败，请稍后重试。");
        return;
      }
      setDetail(updated);
      setAllItems((current) =>
        current.map((item) => (item.id === selectedId ? { ...item, ...updated } : item)),
      );
      setSaveMessage(
        capabilities?.dataMode === "preview"
          ? getSaveSuccessMessage("preview", "lead")
          : getSaveSuccessMessage("upstream", "lead"),
      );
    } catch (error) {
      setSaveError(getApiErrorMessage(error, "保存失败，请稍后重试。"));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    const leads = await resolveLeadsForExport(filters, items);
    if (!leads.length) {
      setExportMessage(t(defaultLocale, "leads.export.empty"));
      return;
    }
    exportLeadsToCsv(leads);
    setExportMessage(`${t(defaultLocale, "leads.export.success")}：${leads.length} 条`);
  }

  async function createLead() {
    const name = createForm.name.trim();
    if (!name) return;
    setCreating(false);
    setCreateMessage(null);
    try {
      const { item, preview } = await createLeadEntry({
        name,
        contact: createForm.contact.trim() || undefined,
        sourceBot: createForm.sourceBot.trim() || undefined,
        lastQuestion: createForm.lastQuestion.trim() || undefined,
      });
      setCreatedLeads((current) => [item, ...current]);
      setCreateForm({ name: "", contact: "", sourceBot: "", lastQuestion: "" });
      setCreateMessage(
        preview
          ? "已新建线索（预览模式，本机会话内有效）。"
          : "线索已创建。",
      );
    } catch (error) {
      setCreateMessage(getApiErrorMessage(error, "创建失败，请稍后重试。"));
    }
  }

  if (loadState === "error") {
    return (
      <ConsolePage>
        <PageHeader
          variant="compact"
          title={t(defaultLocale, "leads.title")}
          description={t(defaultLocale, "leads.description")}
        />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="线索" />
          <ConsoleRequestError
            message={listError ?? t(defaultLocale, "leads.error.load")}
            onRetry={() => void loadList()}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <PageHeader
        variant="compact"
        title={t(defaultLocale, "leads.title")}
        description={t(defaultLocale, "leads.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleModeBadge />
            <Button variant="default" onClick={() => setCreating(true)} disabled={loadState === "loading"}>
              <Plus className="h-4 w-4" aria-hidden />
              新建线索
            </Button>
            <Button variant="outline" onClick={() => void handleExport()} disabled={loadState === "loading"}>
              <Download className="h-4 w-4" aria-hidden />
              {t(defaultLocale, "leads.export.action")}
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="线索" />

        {readOnly && capabilities?.readOnlyReason ? (
          <ConsoleReadOnlyNotice description={capabilities.readOnlyReason} />
        ) : null}

        {exportMessage ? (
          <ConsoleFeedback
            variant="success"
            title={exportMessage}
            onDismiss={() => setExportMessage(null)}
          />
        ) : null}

        {createMessage ? (
          <ConsoleFeedback
            variant="success"
            title={createMessage}
            onDismiss={() => setCreateMessage(null)}
          />
        ) : null}

        {loadState === "ready" ? (
          <div className="grid gap-3 md:grid-cols-3 ui-stagger-fade-in ui-hover-lift-children">
            <StatCard
              emphasis="metric"
              label="当前筛选结果"
              value={`${items.length} 条`}
              description="会根据状态、机器人和负责人实时变化。"
              icon={<Filter size={22} aria-hidden />}
              iconTone="brand"
            />
            <StatCard
              emphasis="metric"
              label="跟进中"
              value={`${followingCount} 条`}
              description="适合优先安排销售或客服继续推进。"
              icon={<Star size={22} aria-hidden />}
              iconTone="success"
            />
            <StatCard
              emphasis="metric"
              label="未分配"
              value={`${unassignedCount} 条`}
              description={wonCount ? `已成交 ${wonCount} 条，可继续复盘。` : "建议尽快分配负责人。"}
              tone={unassignedCount ? "warning" : "default"}
              icon={<UserRound size={22} aria-hidden />}
              iconTone="purple"
            />
          </div>
        ) : null}

        <LeadFiltersBar
          filters={filters}
          botOptions={botOptions}
          assigneeOptions={assigneeOptions}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        />

        {loadState === "loading" ? (
          <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length ? (
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card ui-stagger-fade-in ui-hover-lift-children">
            <LeadTable leads={items} selectedId={selectedId} onSelect={handleSelectLead} />
          </div>
        ) : hasActiveFilters ? (
          <ConsoleEmptyState
            preset="noMatches"
            actionLabel="重置筛选"
            onAction={() => setFilters(defaultFilters)}
          />
        ) : (
          <ConsoleEmptyState preset="noLeads" />
        )}
      </ConsolePageAlerts>

      <LeadDetailSheet
        open={sheetOpen}
        lead={detail}
        loading={detailLoading}
        errorMessage={detailError}
        assigneeOptions={assigneeOptions}
        saving={saving}
        saveMessage={saveMessage}
        saveError={saveError}
        readOnly={readOnly}
        readOnlyReason={capabilities?.readOnlyReason}
        previewMode={capabilities?.dataMode === "preview"}
        previewSaveHint={capabilities?.previewSaveHint}
        onClose={handleCloseSheet}
        onRetry={() => selectedId && void loadDetail(selectedId)}
        onSave={(patch) => void handleSave(patch)}
      />
      {creating ? (
        <div
          onClick={() => setCreating(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-card" style={{ width: 440, maxWidth: "92vw", boxShadow: "0 20px 50px rgba(15,23,42,0.25)", padding: "20px 24px" }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>新建线索</div>
            <div className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 14 }}>演示模式：创建的数据仅在本次会话内可见</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="text-muted-foreground" style={{ fontSize: 13 }}>客户 / 联系人 *</label>
                <input
                  className="border border-border" style={{ borderRadius: 8, padding: "8px 10px", fontSize: 13, width: "100%", outline: "none" }}
                  placeholder="例如：华东制造 王经理"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="text-muted-foreground" style={{ fontSize: 13 }}>联系方式</label>
                <input
                  className="border border-border" style={{ borderRadius: 8, padding: "8px 10px", fontSize: 13, width: "100%", outline: "none" }}
                  placeholder="电话 / 微信"
                  value={createForm.contact}
                  onChange={(e) => setCreateForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="text-muted-foreground" style={{ fontSize: 13 }}>来源渠道</label>
                <input
                  className="border border-border" style={{ borderRadius: 8, padding: "8px 10px", fontSize: 13, width: "100%", outline: "none" }}
                  placeholder="例如：官网 Widget / 抖音"
                  value={createForm.sourceBot}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sourceBot: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="text-muted-foreground" style={{ fontSize: 13 }}>需求备注</label>
                <input
                  className="border border-border" style={{ borderRadius: 8, padding: "8px 10px", fontSize: 13, width: "100%", outline: "none" }}
                  placeholder="例如：户外机柜，IP54，数量 20"
                  value={createForm.lastQuestion}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastQuestion: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <Button variant="outline" onClick={() => setCreating(false)}>取消</Button>
              <Button variant="default" onClick={createLead} disabled={!createForm.name.trim()}>创建</Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConsolePage>
  );
}
