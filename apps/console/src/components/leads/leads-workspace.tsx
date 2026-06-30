"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Users } from "lucide-react";

import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";
import { LeadFiltersBar } from "@/components/leads/lead-filters";
import { LeadTable } from "@/components/leads/lead-table";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { exportLeadsToCsv } from "@/lib/leads/export";
import {
  getLeadDetail,
  getAssigneeOptions,
  getBotFilterOptions,
  getLeadsForExport,
  LEADS_API_AVAILABLE,
  listLeads,
  saveLeadUpdate,
} from "@/lib/leads/data";
import type { LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "@/lib/leads/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

const defaultFilters: LeadFilters = {
  query: "",
  status: "all",
  botId: "all",
  assignee: "all",
};

type LoadState = "loading" | "ready" | "error";

export function LeadsWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const botOptions = useMemo(() => getBotFilterOptions(), []);
  const assigneeOptions = useMemo(() => getAssigneeOptions(), []);

  const loadList = useCallback(async (nextFilters: LeadFilters) => {
    setLoadState("loading");
    try {
      const data = await listLeads(nextFilters);
      setItems(data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
      setItems([]);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const data = await getLeadDetail(id);
    setDetail(data);
  }, []);

  useEffect(() => {
    void loadList(filters);
  }, [filters, loadList]);

  useEffect(() => {
    if (!selectedId || !sheetOpen) return;
    void loadDetail(selectedId);
  }, [selectedId, sheetOpen, loadDetail]);

  function handleSelectLead(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
    setSaveMessage(null);
  }

  function handleCloseSheet() {
    setSheetOpen(false);
    setSaveMessage(null);
  }

  async function handleSave(patch: {
    status: LeadStatus;
    assignee: string | null;
    notes: string;
  }) {
    if (!selectedId) return;
    setSaving(true);
    setSaveMessage(null);
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    const updated = await saveLeadUpdate(selectedId, patch);
    if (updated) {
      setDetail(updated);
      setItems((current) =>
        current.map((item) => (item.id === selectedId ? { ...item, ...updated } : item)),
      );
      setSaveMessage(t(defaultLocale, "leads.detail.saved"));
    }
    setSaving(false);
  }

  function handleExport() {
    const leads = getLeadsForExport(filters);
    if (!leads.length) {
      setExportMessage(t(defaultLocale, "leads.export.empty"));
      return;
    }
    exportLeadsToCsv(leads);
    setExportMessage(`${t(defaultLocale, "leads.export.success")}（${leads.length}）`);
    window.setTimeout(() => setExportMessage(null), 3000);
  }

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "leads.title")}
          description={t(defaultLocale, "leads.description")}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <Alert variant="error" title={t(defaultLocale, "leads.error.load")} />
          <Button variant="outline" size="sm" onClick={() => void loadList(filters)}>
            {t(defaultLocale, "dashboard.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(defaultLocale, "leads.title")}
        description={t(defaultLocale, "leads.description")}
        actions={
          <div className="flex items-center gap-2">
            <ConsoleModeBadge />
            <Button variant="outline" onClick={handleExport} disabled={loadState === "loading"}>
            <Download className="h-4 w-4" aria-hidden />
            {t(defaultLocale, "leads.export.action")}
          </Button>
          </div>
        }
      />

      <div className="space-y-4 px-4 sm:px-6 lg:px-page">
        <ConsoleDataModeBanner feature="线索" />
        {!LEADS_API_AVAILABLE ? (
          <Alert
            variant="warning"
            title="线索列表接口尚未接入"
          >
            当前展示的是演示数据，用于验证筛选、详情与 CSV 导出交互。接入 GET /leads 后将自动切换为真实 API。
          </Alert>
        ) : null}
        <LeadFiltersBar
          filters={filters}
          botOptions={botOptions}
          assigneeOptions={assigneeOptions}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        />

        {exportMessage ? <Alert variant="success" title={exportMessage} /> : null}

        {loadState === "loading" ? (
          <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length ? (
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <LeadTable leads={items} selectedId={selectedId} onSelect={handleSelectLead} />
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "leads.empty.title")}
            description={t(defaultLocale, "leads.empty.description")}
          />
        )}
      </div>

      <LeadDetailSheet
        open={sheetOpen}
        lead={detail}
        assigneeOptions={assigneeOptions}
        saving={saving}
        saveMessage={saveMessage}
        onClose={handleCloseSheet}
        onSave={(patch) => void handleSave(patch)}
      />
    </div>
  );
}
