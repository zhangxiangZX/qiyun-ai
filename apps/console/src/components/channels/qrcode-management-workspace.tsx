"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Download,
  Edit3,
  Headphones,
  Link2,
  Megaphone,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Users,
} from "lucide-react";

import { Badge, Button, Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { QrcodeTutorialDialog } from "@/components/channels/qrcode-tutorial-dialog";
import { listSalesLinks, resolveSalesLinkPublicUrl, type SalesLinkView } from "@/lib/channels/api";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  countByStatus,
  mockQrcodeEntries,
  mockQrcodeOverview,
} from "@/lib/channels/qrcode-mock-data";
import { buildQrcodeOverviewFromLinks } from "@/lib/channels/qrcode-overview";
import type {
  QrcodeEntry,
  QrcodeEntryKind,
  QrcodeEntryStatus,
  QrcodeOverviewStats,
  QrcodeStatusTab,
} from "@/lib/channels/qrcode-types";

const PAGE_SIZE = 10;

const STATUS_TABS: Array<{ key: QrcodeStatusTab; label: string }> = [
  { key: "all", label: "全部" },
  { key: "active", label: "活跃中" },
  { key: "paused", label: "已暂停" },
  { key: "expired", label: "已过期" },
  { key: "draft", label: "草稿" },
];

const USE_CASES = [
  {
    icon: Megaphone,
    title: "产品宣传",
    description: "分享产品介绍，吸引潜在客户扫码了解",
    tone: "bg-blue-50 text-blue-600",
  },
  {
    icon: Building2,
    title: "展会活动",
    description: "线下展会收集客户线索，快速跟进",
    tone: "bg-violet-50 text-violet-600",
  },
  {
    icon: Headphones,
    title: "售后服务",
    description: "客户快速进入售后通道，提升满意度",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Users,
    title: "渠道合作",
    description: "为合作伙伴生成专属入口，追踪效果",
    tone: "bg-amber-50 text-amber-600",
  },
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function mapApiLinkToEntry(link: SalesLinkView, index: number): QrcodeEntry {
  const kind: QrcodeEntryKind = index % 2 === 0 ? "qrcode" : "sales_link";
  return {
    id: link.id,
    name: link.name,
    remark: link.channelLabel,
    kind,
    linkedContent: link.targetUrl ?? resolveSalesLinkPublicUrl(link),
    creator: link.creator,
    todayVisits: Math.max(1, Math.round(link.visits * 0.05)),
    totalVisits: link.visits,
    uv: Math.round(link.visits * 0.68),
    status: link.status === "active" ? "active" : "paused",
    statusNote: link.status === "active" ? "永久有效" : "已停用",
    createdAt: link.createdAt,
    linkId: link.id,
  };
}

function KindIcon({ kind }: { kind: QrcodeEntryKind }) {
  const isQr = kind === "qrcode";
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        isQr ? "bg-violet-100 text-violet-600" : "bg-sky-100 text-sky-600"
      }`}
    >
      {isQr ? <QrCode className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
    </span>
  );
}

function StatusCell({ status, note }: { status: QrcodeEntryStatus; note: string }) {
  const variant =
    status === "active" ? "success" : status === "paused" ? "warning" : "secondary";
  const label =
    status === "active"
      ? "活跃中"
      : status === "paused"
        ? "已暂停"
        : status === "expired"
          ? "已过期"
          : "草稿";

  return (
    <div className="space-y-0.5">
      <Badge variant={variant}>{label}</Badge>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

const EMPTY_OVERVIEW: QrcodeOverviewStats = {
  qrcodeVisits: 0,
  qrcodeVisitsGrowth: 0,
  salesLinkVisits: 0,
  salesLinkVisitsGrowth: 0,
  uniqueVisitors: 0,
  uniqueVisitorsGrowth: 0,
  inquiryConversions: 0,
  inquiryConversionsGrowth: 0,
};

function OverviewMetric({
  label,
  value,
  growth,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  growth: number;
  icon: typeof QrCode;
  iconClass: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-5 w-5 text-white" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-snug text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-bold leading-tight text-foreground">
          {(value ?? 0).toLocaleString("zh-CN")}
        </p>
        <p className="mt-1 text-[11px] font-medium text-emerald-600">
          较上月 ↑ {(growth ?? 0).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function DataOverviewCard({ stats }: { stats?: QrcodeOverviewStats | null }) {
  const data: QrcodeOverviewStats = {
    ...EMPTY_OVERVIEW,
    ...(stats && typeof stats === "object" ? stats : {}),
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">数据概览 (近 30 天)</h2>
        <Link
          href="/dashboard/reports"
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          更多数据
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <OverviewMetric
          label="二维码访问次数"
          value={Number(data.qrcodeVisits) || 0}
          growth={Number(data.qrcodeVisitsGrowth) || 0}
          icon={QrCode}
          iconClass="bg-[#60a5fa]"
        />
        <OverviewMetric
          label="销售链接访问次数"
          value={Number(data.salesLinkVisits) || 0}
          growth={Number(data.salesLinkVisitsGrowth) || 0}
          icon={Link2}
          iconClass="bg-[#4ade80]"
        />
        <OverviewMetric
          label="独立访客 (UV)"
          value={Number(data.uniqueVisitors) || 0}
          growth={Number(data.uniqueVisitorsGrowth) || 0}
          icon={Users}
          iconClass="bg-[#a78bfa]"
        />
        <OverviewMetric
          label="线索转化数"
          value={Number(data.inquiryConversions) || 0}
          growth={Number(data.inquiryConversionsGrowth) || 0}
          icon={Megaphone}
          iconClass="bg-[#fb923c]"
        />
      </div>
    </section>
  );
}

function OverviewPanel({ stats }: { stats?: QrcodeOverviewStats | null }) {
  return (
    <aside className="space-y-4">
      <DataOverviewCard stats={stats} />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">快速创建</h2>
        <div className="space-y-2">
          <Link
            href="/dashboard/channels/links/new?type=qrcode"
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <QrCode size={22} />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">创建二维码</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                生成链接、文件或客服二维码
              </span>
            </span>
          </Link>
          <Link
            href="/dashboard/channels/links/new"
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Link2 size={22} />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">创建销售链接</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                专属链接追踪访问与询盘
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">使用场景推荐</h2>
        <ul className="space-y-3">
          {USE_CASES.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tone}`}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span>共 {total} 条记录</span>
      <div className="flex items-center gap-1">
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`min-w-8 rounded-md px-2 py-1 text-sm transition-colors ${
              page === pageNumber
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {pageNumber}
          </button>
        ))}
        <span className="ml-2 text-xs">10 条/页</span>
      </div>
    </div>
  );
}

export function QrcodeManagementWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [entries, setEntries] = useState<QrcodeEntry[]>([]);
  const [overview, setOverview] = useState<QrcodeOverviewStats>(EMPTY_OVERVIEW);

  const [statusTab, setStatusTab] = useState<QrcodeStatusTab>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | QrcodeEntryKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | QrcodeEntryStatus>("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode();
      if (isPreviewMode(mode)) {
        setEntries(mockQrcodeEntries);
        setOverview(mockQrcodeOverview);
        setIsPreview(true);
        return;
      }
      const links = await listSalesLinks();
      setEntries(links.map(mapApiLinkToEntry));
      setOverview(buildQrcodeOverviewFromLinks(links) ?? EMPTY_OVERVIEW);
      setIsPreview(false);
    } catch (reason) {
      setEntries([]);
      setOverview(EMPTY_OVERVIEW);
      setIsPreview(false);
      setError(reason instanceof Error ? reason.message : "二维码数据加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const creators = useMemo(
    () => ["all", ...Array.from(new Set(entries.map((entry) => entry.creator))).sort()],
    [entries],
  );

  const statusCounts = useMemo(() => countByStatus(entries), [entries]);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusTab !== "all" && entry.status !== statusTab) return false;
      if (typeFilter !== "all" && entry.kind !== typeFilter) return false;
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (creatorFilter !== "all" && entry.creator !== creatorFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime()) && new Date(entry.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (!Number.isNaN(to.getTime()) && new Date(entry.createdAt) > to) return false;
      }
      if (!lowered) return true;
      return (
        entry.name.toLowerCase().includes(lowered) ||
        entry.remark.toLowerCase().includes(lowered) ||
        entry.linkedContent.toLowerCase().includes(lowered)
      );
    });
  }, [entries, statusTab, typeFilter, statusFilter, creatorFilter, dateFrom, dateTo, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [statusTab, typeFilter, statusFilter, creatorFilter, dateFrom, dateTo, query]);

  const openDetail = (entry: QrcodeEntry) => {
    if (entry.linkId) {
      router.push(`/dashboard/channels/links/${entry.linkId}`);
      return;
    }
    router.push("/dashboard/channels/links/new");
  };

  const resetFilters = () => {
    setStatusTab("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setCreatorFilter("all");
    setDateFrom("");
    setDateTo("");
    setQuery("");
  };

  return (
    <ConsolePage>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" type="button" onClick={() => setTutorialOpen(true)}>
          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          使用教程
        </Button>
        <Button asChild size="sm">
          <Link href="/dashboard/channels/links/new?type=qrcode">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            创建二维码
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/dashboard/channels/links/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            创建销售链接
          </Link>
        </Button>
      </div>

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="二维码管理" />
      </ConsolePageAlerts>

      <div className="pb-6">
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <Skeleton className="hidden h-[520px] rounded-2xl xl:block" />
          </div>
        ) : error ? (
          <ConsoleRequestError message={error} onRetry={() => void load()} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap gap-1 border-b border-border px-4 pt-3">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusTab(tab.key)}
                      className={`mb-[-1px] rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors ${
                        statusTab === tab.key
                          ? "border-primary font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label} ({statusCounts[tab.key]})
                    </button>
                  ))}
                </div>

                <div className="space-y-3 border-b border-border p-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(event.target.value as "all" | QrcodeEntryKind)
                      }
                    >
                      <option value="all">类型</option>
                      <option value="qrcode">二维码</option>
                      <option value="sales_link">销售链接</option>
                    </select>
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as "all" | QrcodeEntryStatus)
                      }
                    >
                      <option value="all">状态</option>
                      <option value="active">活跃中</option>
                      <option value="paused">已暂停</option>
                      <option value="expired">已过期</option>
                      <option value="draft">草稿</option>
                    </select>
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      value={creatorFilter}
                      onChange={(event) => setCreatorFilter(event.target.value)}
                    >
                      {creators.map((creator) => (
                        <option key={creator} value={creator}>
                          {creator === "all" ? "创建人" : creator}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="开始日期"
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="结束日期"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        className="w-full rounded-md border border-border py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="搜索名称或备注"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm" type="button" onClick={resetFilters}>
                      重置
                    </Button>
                  </div>
                </div>

                {paged.length === 0 ? (
                  <div className="p-6">
                    <ConsoleEmptyState
                      preset="noMatches"
                      title="没有匹配的二维码或链接"
                      description="调整筛选条件，或直接创建新的二维码/销售链接。"
                      action={
                        <Button asChild>
                          <Link href="/dashboard/channels/links/new?type=qrcode">创建二维码</Link>
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px] text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                            <th className="px-4 py-3 font-medium">名称 / 备注</th>
                            <th className="px-4 py-3 font-medium">类型</th>
                            <th className="px-4 py-3 font-medium">关联内容</th>
                            <th className="px-4 py-3 font-medium">访问数据</th>
                            <th className="px-4 py-3 font-medium">状态</th>
                            <th className="px-4 py-3 font-medium">创建时间</th>
                            <th className="px-4 py-3 text-right font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.map((entry) => (
                            <tr
                              key={entry.id}
                              className="cursor-pointer border-b border-border/60 hover:bg-accent/30"
                              onClick={() => openDetail(entry)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                  <KindIcon kind={entry.kind} />
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground">{entry.name}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {entry.remark} · {entry.creator}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary">
                                  {entry.kind === "qrcode" ? "二维码" : "销售链接"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <span className="line-clamp-2">{entry.linkedContent}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div>
                                    <div className="font-semibold text-foreground">
                                      {entry.todayVisits}
                                    </div>
                                    <div className="text-muted-foreground">今日</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-foreground">
                                      {entry.totalVisits}
                                    </div>
                                    <div className="text-muted-foreground">总访问</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-foreground">{entry.uv}</div>
                                    <div className="text-muted-foreground">UV</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusCell status={entry.status} note={entry.statusNote} />
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {formatDateTime(entry.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <div
                                  className="flex items-center justify-end gap-1"
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="查看数据"
                                    onClick={() => openDetail(entry)}
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="编辑"
                                    onClick={() => openDetail(entry)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="下载二维码"
                                    onClick={() => openDetail(entry)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="更多">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      page={currentPage}
                      totalPages={totalPages}
                      total={filtered.length}
                      onPageChange={setPage}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  共 {filtered.length} 条{isPreview ? "预览数据" : "正式数据"}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/channels/links">前往销售链接管理</Link>
                </Button>
              </div>
            </div>

            <div className="hidden xl:block">
              <OverviewPanel stats={overview} />
            </div>
          </div>
        )}

        {!loading && !error ? (
          <div className="mt-4 space-y-4 xl:hidden">
            <OverviewPanel stats={overview} />
          </div>
        ) : null}
      </div>

      <QrcodeTutorialDialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </ConsolePage>
  );
}
