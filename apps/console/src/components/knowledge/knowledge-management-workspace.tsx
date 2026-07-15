"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  FolderPlus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { listKnowledgeBaseDocuments, listKnowledgeBases } from "@/lib/knowledge/api";
import {
  knowledgeDocumentRows,
  knowledgeRecentHistory,
  knowledgeTopHits,
  type KnowledgeCategoryNode,
  type KnowledgeDocumentRow,
} from "@/lib/knowledge/dashboard-mock-data";
import {
  buildKnowledgeCategories,
  buildKnowledgeStats,
  mapApiDocumentToRow,
} from "@/lib/knowledge/dashboard-stats";
import type { KnowledgeDocument } from "@/lib/knowledge/types";

const PAGE_SIZE = 10;

function TrendPill({ value, tone }: { value: string; tone: "up" | "down" }) {
  return (
    <span className={`text-xs font-medium ${tone === "up" ? "text-emerald-600" : "text-red-600"}`}>
      {tone === "up" ? "↑" : "↓"} {value}
    </span>
  );
}

function FileTypeBadge({ type }: { type: KnowledgeDocumentRow["fileType"] }) {
  const colors: Record<KnowledgeDocumentRow["fileType"], string> = {
    pdf: "bg-red-50 text-red-800",
    docx: "bg-blue-50 text-blue-800",
    pptx: "bg-orange-50 text-orange-800",
    xlsx: "bg-emerald-50 text-emerald-800",
    txt: "bg-slate-100 text-slate-600",
    md: "bg-violet-50 text-violet-600",
    html: "bg-cyan-50 text-cyan-600",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${colors[type]}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: KnowledgeDocumentRow["status"] }) {
  const map = {
    vectorized: {
      label: "已向量化",
      variant: "success" as const,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    processing: {
      label: "处理中",
      variant: "secondary" as const,
      className: "text-slate-800",
    },
    failed: {
      label: "失败",
      variant: "destructive" as const,
      className: "border-red-200 bg-red-50 text-red-800",
    },
    pending: {
      label: "待处理",
      variant: "outline" as const,
      className: "text-slate-700",
    },
  };
  const item = map[status];
  return (
    <Badge variant={item.variant} className={item.className}>
      {item.label}
    </Badge>
  );
}

function mapApiDocument(doc: KnowledgeDocument, index: number): KnowledgeDocumentRow {
  return mapApiDocumentToRow(doc, index);
}

function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: {
  nodes: KnowledgeCategoryNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? "ml-3 border-l border-border pl-2" : ""}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              selectedId === node.id
                ? "bg-blue-50 font-medium text-blue-800"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="truncate">{node.name}</span>
            <span className="shrink-0 text-xs">{node.count}</span>
          </button>
          {node.children ? (
            <CategoryTree
              nodes={node.children}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function KnowledgeManagementWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(true);
  const [documents, setDocuments] = useState<KnowledgeDocumentRow[]>(knowledgeDocumentRows);
  const [categoryId, setCategoryId] = useState("all");
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | KnowledgeDocumentRow["status"]>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bases = await listKnowledgeBases();
      if (!bases.length) {
        setDocuments(knowledgeDocumentRows);
        setIsPreview(true);
        return;
      }
      const docs = await listKnowledgeBaseDocuments(bases[0]!.id);
      if (docs.length) {
        setDocuments(docs.map(mapApiDocument));
        setIsPreview(false);
      } else {
        setDocuments(knowledgeDocumentRows);
        setIsPreview(true);
      }
    } catch {
      setDocuments(knowledgeDocumentRows);
      setIsPreview(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => buildKnowledgeCategories(documents), [documents]);
  const stats = useMemo(() => buildKnowledgeStats(documents), [documents]);
  const recentHistory = useMemo(() => {
    if (isPreview) return knowledgeRecentHistory;
    return documents
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 5)
      .map((doc, index) => ({
        id: doc.id,
        action: `更新「${doc.fileName}」`,
        user: "当前工作区",
        time: doc.updatedAt,
      }))
      .filter((_, index) => index < 5);
  }, [documents, isPreview]);
  const topHits = useMemo(() => {
    if (isPreview) return knowledgeTopHits;
    return documents
      .slice()
      .sort((a, b) => (b.segments ?? 0) - (a.segments ?? 0))
      .slice(0, 5)
      .map((doc, index) => ({
        rank: index + 1,
        name: doc.fileName,
        hits: doc.segments ?? 0,
        hitRate: Math.min(100, Math.round(((doc.segments ?? 0) / Math.max(doc.segments ?? 1, 1)) * 80 + 20)),
      }));
  }, [documents, isPreview]);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const selectedCategory = categories.find((node) => node.id === categoryId);
    return documents.filter((doc) => {
      if (categoryId !== "all" && selectedCategory && doc.category !== selectedCategory.name) return false;
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (sourceFilter !== "all" && doc.source !== sourceFilter) return false;
      if (!lowered) return true;
      return (
        doc.fileName.toLowerCase().includes(lowered) ||
        doc.category.toLowerCase().includes(lowered) ||
        doc.linkedAssistant.toLowerCase().includes(lowered)
      );
    });
  }, [documents, statusFilter, sourceFilter, query, categoryId, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, query, categoryId]);

  function handleCreateCategory() {
    setCategoryNotice("V1 暂不支持自定义分类，文档将按来源自动归类。");
    window.setTimeout(() => setCategoryNotice(null), 3000);
  }

  return (
    <ConsolePage>
      <PageHeader
        title="知识库"
        description="管理企业 AI 训练资料，支持分类、向量化与助手绑定。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              刷新
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/knowledge-bases/upload">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                上传资料
              </Link>
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={handleCreateCategory}>
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
              新建分类
            </Button>
          </div>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="知识库" />
      </ConsolePageAlerts>

      <div className="space-y-4">
        {categoryNotice ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {categoryNotice}
          </p>
        ) : null}
        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <ConsoleRequestError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <StatCard
                emphasis="metric"
                label="文档总数"
                value={String(stats.totalDocuments)}
                icon={<FileText className="h-5 w-5" />}
                iconTone="brand"
                trend={<TrendPill value={`${stats.totalGrowth}%`} tone="up" />}
              />
              <StatCard
                emphasis="metric"
                label="已向量化"
                value={String(stats.vectorized)}
                description={`占总量 ${stats.vectorizedRate}%`}
                icon={<FileText className="h-5 w-5" />}
                iconTone="success"
              />
              <StatCard
                emphasis="metric"
                label="待处理"
                value={String(stats.pending)}
                icon={<FileText className="h-5 w-5" />}
                iconTone="warning"
                trend={<TrendPill value={`${Math.abs(stats.pendingChange)}%`} tone="down" />}
              />
              <StatCard
                emphasis="metric"
                label="最近更新"
                value={stats.recentUpdateAt.split(" ")[0] ?? stats.recentUpdateAt}
                description={stats.recentUpdateFile}
                icon={<RefreshCw className="h-5 w-5" />}
                iconTone="info"
              />
              <StatCard
                emphasis="metric"
                label="平均命中率"
                value={`${stats.avgHitRate}%`}
                icon={<FileText className="h-5 w-5" />}
                iconTone="purple"
                trend={<TrendPill value={`${stats.hitRateChange}pp`} tone="up" />}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-md border border-border py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="搜索文档名称、内容或标签"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                aria-label="按文档状态筛选"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
              >
                <option value="all">状态</option>
                <option value="vectorized">已向量化</option>
                <option value="processing">处理中</option>
                <option value="failed">失败</option>
                <option value="pending">待处理</option>
              </select>
              <select
                aria-label="按文档来源筛选"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="all">来源</option>
                <option value="手动上传">手动上传</option>
                <option value="批量导入">批量导入</option>
              </select>
              <Button asChild size="sm">
                <Link href="/dashboard/knowledge-bases/upload">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  上传资料
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">分类目录</h2>
                  <Button variant="ghost" size="sm" type="button">
                    管理分类
                  </Button>
                </div>
                <CategoryTree
                  nodes={categories}
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                />
              </aside>

              <div className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
                {paged.length === 0 ? (
                  <div className="p-6">
                    <ConsoleEmptyState
                      preset="noDocuments"
                      action={
                        <Button asChild>
                          <Link href="/dashboard/knowledge-bases/upload">上传资料</Link>
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                            <th className="px-4 py-3 font-medium">文件名称</th>
                            <th className="px-4 py-3 font-medium">分类</th>
                            <th className="px-4 py-3 font-medium">来源</th>
                            <th className="px-4 py-3 font-medium">状态</th>
                            <th className="px-4 py-3 font-medium">分段数</th>
                            <th className="px-4 py-3 font-medium">更新时间</th>
                            <th className="px-4 py-3 font-medium">关联助手</th>
                            <th className="px-4 py-3 text-right font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.map((doc) => (
                            <tr key={doc.id} className="border-b border-border/60 hover:bg-accent/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileTypeBadge type={doc.fileType} />
                                  <span className="font-medium text-foreground">{doc.fileName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{doc.category}</td>
                              <td className="px-4 py-3 text-muted-foreground">{doc.source}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={doc.status} />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {doc.segments ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {doc.updatedAt}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{doc.linkedAssistant}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" type="button">
                                    查看
                                  </Button>
                                  <Button variant="ghost" size="sm" type="button">
                                    关联
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    type="button"
                                    aria-label={`更多操作：${doc.fileName}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                      <span>
                        共 {filtered.length} 条{isPreview ? "预览数据" : "正式数据"}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(
                          (pageNumber) => (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setPage(pageNumber)}
                              className={`min-w-8 rounded-md px-2 py-1 ${
                                currentPage === pageNumber
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ),
                        )}
                        <span className="ml-2">10 条/页</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">最近更新记录</h2>
                <ul className="space-y-3">
                  {recentHistory.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="text-foreground">{item.action}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.user}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">命中 TOP5 文档</h2>
                <div className="space-y-3">
                  {topHits.map((item) => (
                    <div key={item.rank} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {item.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          命中 {item.hits} 次 · {item.hitRate}%
                        </p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${item.hitRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </ConsolePage>
  );
}
