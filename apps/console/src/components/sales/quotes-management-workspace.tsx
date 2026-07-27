"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Timer,
  TrendingUp,
} from "lucide-react";

import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { listQuoteOpportunities } from "@/lib/sales/api";
import { buildQuoteListHref, withReturnTo } from "@/lib/sales/list-return";
import {
  formatQuoteNumber,
  formatQuoteValidityNote,
  resolveQuoteDisplayStatus,
} from "@/lib/sales/quotes-dashboard-helpers";
import {
  QUOTE_DASHBOARD_ROWS,
  QUOTE_DASHBOARD_STATS,
  QUOTE_STATUS_LABELS,
  QUOTE_TAB_COUNTS,
  type QuoteDashboardRow,
  type QuoteDisplayStatus,
} from "@/lib/sales/quotes-dashboard-mock";
import type { QuoteListItem } from "@/lib/sales/types";

const PAGE_SIZE = 10;

const STATUS_TABS: Array<{ key: QuoteDisplayStatus | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "to_send", label: "待发送" },
  { key: "sent", label: "已发送" },
  { key: "to_confirm", label: "待确认" },
  { key: "won", label: "已成交" },
  { key: "void", label: "已失效" },
];

const STATUS_VARIANT: Record<
  QuoteDisplayStatus,
  "secondary" | "warning" | "success" | "destructive"
> = {
  draft: "secondary",
  to_send: "warning",
  sent: "secondary",
  to_confirm: "warning",
  won: "success",
  void: "secondary",
  expiring: "destructive",
};

function TrendPill({ value }: { value: string }) {
  return <span className="text-xs font-medium text-emerald-600">↑ {value}</span>;
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

function safeBusinessLabel(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized || /^\?+$/.test(normalized) || normalized.includes("�")) return fallback;
  return normalized;
}

function mapApiToDashboardRow(item: QuoteListItem, index: number): QuoteDashboardRow {
  const status = resolveQuoteDisplayStatus(item);
  const validityNote = formatQuoteValidityNote(item);

  return {
    id: item.id,
    number: formatQuoteNumber(item, index),
    company: safeBusinessLabel(item.customerName, "未命名客户"),
    inquiryId: item.inquiryId,
    product: safeBusinessLabel(item.title, "未命名报价"),
    amount: item.quotedAmount ?? item.estimatedAmount ?? 0,
    status,
    validity: item.quoteDueAt?.slice(0, 10) ?? "—",
    validityNote,
    ownerName: safeBusinessLabel(item.ownerId?.replace(/^sales_/, ""), "未分配"),
    ownerAvatar: (item.ownerId?.replace(/^sales_/, "") ?? "?").slice(0, 1),
    updatedAt: new Date(item.updatedAt).toLocaleString("zh-CN"),
  };
}

export function QuotesManagementWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusTab, setStatusTab] = useState<QuoteDisplayStatus | "all">(
    () => (searchParams.get("status") as QuoteDisplayStatus | "all") || "all",
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const listHref = useMemo(
    () => buildQuoteListHref({ status: statusTab, q: debouncedQuery }),
    [statusTab, debouncedQuery],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    router.replace(listHref, { scroll: false });
  }, [listHref, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : false;
      setIsPreview(preview);
      if (preview) return;
      const items = await listQuoteOpportunities({ q: debouncedQuery });
      setData(items);
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "报价列表加载失败，请稍后重试。"));
      setIsPreview(false);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (isPreview) return QUOTE_DASHBOARD_ROWS;
    return data.map(mapApiToDashboardRow);
  }, [data, isPreview]);

  const tabCounts = useMemo(() => {
    if (isPreview) return QUOTE_TAB_COUNTS;
    const mapped = data.map(mapApiToDashboardRow);
    return {
      all: mapped.length,
      draft: mapped.filter((r) => r.status === "draft").length,
      to_send: mapped.filter((r) => r.status === "to_send").length,
      sent: mapped.filter((r) => r.status === "sent").length,
      to_confirm: mapped.filter((r) => r.status === "to_confirm").length,
      won: mapped.filter((r) => r.status === "won").length,
      void: mapped.filter((r) => r.status === "void").length,
      expiring: mapped.filter((r) => r.status === "expiring").length,
    };
  }, [data, isPreview]);

  const stats = isPreview
    ? QUOTE_DASHBOARD_STATS
    : {
        total: tabCounts.all,
        totalGrowth: 0,
        toSend: tabCounts.to_send,
        toSendGrowth: 0,
        sent: tabCounts.sent,
        sentGrowth: 0,
        toConfirm: tabCounts.to_confirm,
        toConfirmGrowth: 0,
        won: tabCounts.won,
        wonGrowth: 0,
        expiring: tabCounts.expiring,
        expiringGrowth: 0,
      };

  const filtered = useMemo(() => {
    const lowered = debouncedQuery.trim().toLowerCase();
    const sourceRows = isPreview ? rows : data.map(mapApiToDashboardRow);
    return sourceRows.filter((row) => {
      if (statusTab !== "all" && row.status !== statusTab) return false;
      const source = data.find((item) => item.id === row.id);
      const updatedAt = source?.updatedAt
        ? new Date(source.updatedAt)
        : new Date(row.updatedAt.replace(" ", "T"));
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (!Number.isNaN(updatedAt.getTime()) && updatedAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`);
        if (!Number.isNaN(updatedAt.getTime()) && updatedAt > to) return false;
      }
      if (!lowered) return true;
      return (
        row.number.toLowerCase().includes(lowered) ||
        row.company.toLowerCase().includes(lowered) ||
        row.product.toLowerCase().includes(lowered) ||
        row.inquiryId.toLowerCase().includes(lowered)
      );
    });
  }, [rows, statusTab, debouncedQuery, data, isPreview, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const detailHref = (row: QuoteDashboardRow) =>
    withReturnTo(`/dashboard/quotes/${row.id}`, listHref);

  function handleExport() {
    const source = filtered;
    if (!source.length) {
      setExportNotice("当前筛选条件下没有可导出的报价。");
      return;
    }
    const header = ["number", "company", "product", "amount", "status", "updatedAt"];
    const lines = [header.join(",")];
    for (const row of source) {
      lines.push(
        [row.number, row.company, row.product, String(row.amount), row.status, row.updatedAt]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(`已导出 ${source.length} 条报价记录。`);
  }

  return (
    <ConsolePage>
      <PageHeader
        variant="compact"
        title="报价管理"
        description="创建、发送并追踪客户报价，统一管理成交进度。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/dashboard/quotes/new">
                <Plus className="mr-1.5 h-4 w-4" />
                新建报价
              </Link>
            </Button>
            <Button variant="outline" type="button" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              导出
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="报价管理" />
        {exportNotice ? (
          <p className="text-sm text-emerald-700" role="status">{exportNotice}</p>
        ) : null}
      </ConsolePageAlerts>

      <div className="space-y-4">
        {error ? (
          <ConsoleRequestError message={error} onRetry={() => void load()} />
        ) : loading && !isPreview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <StatCard
                emphasis="metric"
                label="报价总数"
                value={String(stats.total)}
                icon={<FileText size={22} />}
                iconTone="brand"
                trend={isPreview ? <TrendPill value={`${stats.totalGrowth}%`} /> : undefined}
              />
              <StatCard
                emphasis="metric"
                label="待发送"
                value={String(stats.toSend)}
                icon={<Send size={22} />}
                iconTone="warning"
                trend={isPreview ? <TrendPill value={`${stats.toSendGrowth}%`} /> : undefined}
              />
              <StatCard
                emphasis="metric"
                label="已发送"
                value={String(stats.sent)}
                icon={<Clock3 size={22} />}
                iconTone="brand"
                trend={isPreview ? <TrendPill value={`${stats.sentGrowth}%`} /> : undefined}
              />
              <StatCard
                emphasis="metric"
                label="待确认"
                value={String(stats.toConfirm)}
                icon={<Timer size={22} />}
                iconTone="purple"
                trend={isPreview ? <TrendPill value={`${stats.toConfirmGrowth}%`} /> : undefined}
              />
              <StatCard
                emphasis="metric"
                label="已成交"
                value={String(stats.won)}
                icon={<CheckCircle2 size={22} />}
                iconTone="success"
                trend={isPreview ? <TrendPill value={`${stats.wonGrowth}%`} /> : undefined}
              />
              <StatCard
                emphasis="metric"
                label="即将过期"
                value={String(stats.expiring)}
                icon={<TrendingUp size={22} />}
                iconTone="warning"
                trend={isPreview ? <TrendPill value={`${stats.expiringGrowth}%`} /> : undefined}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-md border border-input py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="搜索报价单号、客户公司、产品/项目..."
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusTab}
                onChange={(event) => {
                  setStatusTab(event.target.value as QuoteDisplayStatus | "all");
                  setPage(1);
                }}
                aria-label="报价状态"
              >
                {STATUS_TABS.map((tab) => (
                  <option key={tab.key} value={tab.key}>报价状态：{tab.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="报价更新开始日期"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="rounded-md border border-border px-2 py-2 text-sm"
                />
                <span className="text-muted-foreground">→</span>
                <input
                  type="date"
                  aria-label="报价更新结束日期"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="rounded-md border border-border px-2 py-2 text-sm"
                />
              </div>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusTab("all");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              >
                重置
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusTab(tab.key);
                      setPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      statusTab === tab.key
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {tab.label} ({tabCounts[tab.key]})
                  </button>
                ))}
              </div>

              {paged.length === 0 ? (
                <div className="p-6">
                  <ConsoleEmptyState preset="noMatches" title="没有匹配的报价记录" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label="全选"
                            checked={selected.size === paged.length && paged.length > 0}
                            onChange={() => {
                              if (selected.size === paged.length) setSelected(new Set());
                              else setSelected(new Set(paged.map((row) => row.id)));
                            }}
                          />
                        </th>
                        <th className="px-4 py-3 font-medium">报价单号</th>
                        <th className="px-4 py-3 font-medium">客户公司</th>
                        <th className="px-4 py-3 font-medium">关联询盘</th>
                        <th className="px-4 py-3 font-medium">产品/项目</th>
                        <th className="px-4 py-3 font-medium">报价金额</th>
                        <th className="px-4 py-3 font-medium">报价状态</th>
                        <th className="px-4 py-3 font-medium">有效期</th>
                        <th className="px-4 py-3 font-medium">负责人</th>
                        <th className="px-4 py-3 font-medium">更新时间</th>
                        <th className="px-4 py-3 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((row) => (
                        <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(row.id)}
                              onChange={() => toggleSelect(row.id)}
                              aria-label={`选择 ${row.number}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Link href={detailHref(row)} className="font-medium text-primary hover:underline">
                              {row.number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-foreground">{row.company}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/dashboard/inquiries/${row.inquiryId}`}
                              className="text-primary hover:underline"
                            >
                              {row.inquiryId}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.product}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_VARIANT[row.status]}>
                              {QUOTE_STATUS_LABELS[row.status]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-foreground">{row.validity}</div>
                            <div
                              className={`text-xs ${
                                row.validityNote.includes("过期") || row.validityNote.includes("剩余")
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {row.validityNote}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {row.ownerAvatar}
                              </span>
                              <span>{row.ownerName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{row.updatedAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                <Link href={detailHref(row)}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {row.status === "draft" ? (
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                  <Link href="/dashboard/quotes/new">
                                    <Edit3 className="h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <span>共 {isPreview ? tabCounts.all : filtered.length} 条</span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`min-w-8 rounded-md px-2 py-1 ${
                        currentPage === n ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-xs">10 条/页</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/quotes/templates">报价模板管理</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/quotes">返回报价列表</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/quotes/new">新建报价</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </ConsolePage>
  );
}
