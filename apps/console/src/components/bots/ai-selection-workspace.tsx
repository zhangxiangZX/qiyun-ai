"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  LayoutGrid,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";

import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { ApiError } from "@/lib/api/errors";
import {
  type SelectionPageView,
  listSelectionPages,
} from "@/lib/bots/selection-pages-api";

const PREVIEW_PAGES: SelectionPageView[] = [
  {
    id: "sp-demo-01",
    name: "工业机柜选型页",
    slug: "cabinet-selector",
    description: "用于官网访客快速提交工业机柜需求。",
    status: "published",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
    questionCount: 5,
    requiredQuestionCount: 3,
    primaryColor: "#2563eb",
    questions: [
      { id: "q1", label: "使用场景", type: "select", required: true, options: ["户外", "室内"] },
      { id: "q2", label: "防护等级", type: "select", required: true, options: ["IP54", "IP65"] },
      { id: "q3", label: "宽度要求", type: "number" },
      { id: "q4", label: "深度要求", type: "number" },
      { id: "q5", label: "联系人电话", type: "text", required: true },
    ],
  },
  {
    id: "sp-demo-02",
    name: "边缘网关需求采集页",
    slug: "edge-gateway-intake",
    description: "用于销售分发链接后的项目预沟通和参数收集。",
    status: "draft",
    createdAt: "2026-07-03T08:00:00.000Z",
    updatedAt: "2026-07-09T16:00:00.000Z",
    questionCount: 4,
    requiredQuestionCount: 2,
    primaryColor: "#0f766e",
    questions: [
      { id: "q1", label: "部署行业", type: "text", required: true },
      { id: "q2", label: "设备数量", type: "number" },
      { id: "q3", label: "现场网络环境", type: "text" },
      { id: "q4", label: "联系人电话", type: "text", required: true },
    ],
  },
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function renderStatusBadge(status: SelectionPageView["status"]) {
  if (status === "published") return <Badge variant="success">已发布</Badge>;
  if (status === "disabled") return <Badge variant="secondary">已停用</Badge>;
  return <Badge variant="warning">草稿</Badge>;
}

export function AiSelectionWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [pages, setPages] = useState<SelectionPageView[]>(PREVIEW_PAGES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SelectionPageView["status"]>("all");
  const [savedNotice, setSavedNotice] = useState(false);
  const [selectedId, setSelectedId] = useState(PREVIEW_PAGES[0]?.id ?? "");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextPages = await listSelectionPages();
      setPages(nextPages);
      setSelectedId((current) => current || nextPages[0]?.id || "");
      setIsPreview(false);
    } catch (nextError) {
      setPages(PREVIEW_PAGES);
      setSelectedId((current) => current || PREVIEW_PAGES[0]?.id || "");
      setIsPreview(true);
      if (!(nextError instanceof ApiError && nextError.code === "PREVIEW_MODE")) {
        setError(nextError instanceof Error ? nextError.message : "加载选型页失败。");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (typeof window !== "undefined") {
      const saved = window.sessionStorage.getItem("ai-landing-saved");
      if (saved === "1") {
        setSavedNotice(true);
        window.sessionStorage.removeItem("ai-landing-saved");
      }
    }
  }, []);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return pages.filter((page) => {
      const statusMatched = statusFilter === "all" || page.status === statusFilter;
      const queryMatched =
        !lowered ||
        page.name.toLowerCase().includes(lowered) ||
        page.slug.toLowerCase().includes(lowered) ||
        (page.description ?? "").toLowerCase().includes(lowered);
      return statusMatched && queryMatched;
    });
  }, [pages, query, statusFilter]);

  const selected =
    filtered.find((page) => page.id === selectedId) ??
    pages.find((page) => page.id === selectedId) ??
    filtered[0] ??
    pages[0] ??
    null;

  const metrics = useMemo(() => {
    return {
      total: pages.length,
      published: pages.filter((page) => page.status === "published").length,
      draft: pages.filter((page) => page.status === "draft").length,
      totalQuestions: pages.reduce((sum, page) => sum + page.questionCount, 0),
    };
  }, [pages]);

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="AI 选型页" />
        {savedNotice ? (
          <ConsoleFeedback
            variant="success"
            title="AI 选型页已保存"
            message="页面配置已经更新，发布后会对外生效。"
            onDismiss={() => setSavedNotice(false)}
          />
        ) : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        title="AI 选型页"
        description="管理面向客户的需求采集页，统一配置问题结构、发布状态和页面入口。"
        actions={
          <Button asChild>
            <Link href="/dashboard/bots/landing/new">
              <Plus className="mr-1.5 h-4 w-4" /> 新建选型页
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {loading ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-card" />
          </>
        ) : error ? (
          <ConsoleRequestError message={error} onRetry={() => void load()} />
        ) : pages.length === 0 ? (
          <ConsoleEmptyState
            preset="noMatches"
            title="还没有 AI 选型页"
            description="先创建一个正式页面，用于收集客户需求和联系方式。"
            action={
              <Button asChild>
                <Link href="/dashboard/bots/landing/new">新建选型页</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard emphasis="metric" label="页面总数" value={`${metrics.total}`} icon={<LayoutGrid size={22} />} iconTone="brand" />
              <StatCard emphasis="metric" label="已发布" value={`${metrics.published}`} icon={<Sparkles size={22} />} iconTone="success" />
              <StatCard emphasis="metric" label="草稿中" value={`${metrics.draft}`} icon={<Settings2 size={22} />} iconTone="warning" />
              <StatCard emphasis="metric" label="问题总数" value={`${metrics.totalQuestions}`} icon={<ClipboardList size={22} />} iconTone="purple" />
            </div>

            <div className="rounded-card border border-border bg-card p-4 shadow-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索页面名称、slug 或页面说明"
                    className="ui-control h-[var(--control-height-lg)] pl-9 pr-3"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all" as const, label: "全部" },
                    { key: "published" as const, label: "已发布" },
                    { key: "draft" as const, label: "草稿" },
                    { key: "disabled" as const, label: "已停用" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        statusFilter === item.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <ConsoleEmptyState
                preset="noMatches"
                title="没有匹配的选型页"
                description="调整筛选条件后再试，或直接新建一个页面。"
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="console-table-wrap overflow-x-auto rounded-card border border-border bg-card shadow-card">
                  <table className="console-data-table w-full min-w-[860px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">页面名称</th>
                        <th className="px-4 py-3 font-medium">页面地址</th>
                        <th className="px-4 py-3 font-medium">问题配置</th>
                        <th className="px-4 py-3 font-medium">状态</th>
                        <th className="px-4 py-3 font-medium">最近更新</th>
                        <th className="px-4 py-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((page) => (
                        <tr
                          key={page.id}
                          className={`cursor-pointer border-b border-border/60 hover:bg-accent/40 ${
                            selected?.id === page.id ? "bg-accent/50" : ""
                          }`}
                          onClick={() => setSelectedId(page.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">{page.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {page.description || "暂无页面说明"}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            /s/{page.slug}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {page.questionCount} 个问题 / {page.requiredQuestionCount} 个必填
                          </td>
                          <td className="px-4 py-3">{renderStatusBadge(page.status)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(page.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/bots/landing/edit?id=${encodeURIComponent(page.id)}`}>
                                编辑
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selected ? (
                  <aside className="rounded-card border border-border bg-card p-5 shadow-card">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-foreground">页面预览摘要</h3>
                        {renderStatusBadge(selected.status)}
                      </div>
                      <div className="rounded-card border border-border bg-muted/20 p-4">
                        <div
                          className="h-2 w-20 rounded-full"
                          style={{ backgroundColor: selected.primaryColor || "#2563eb" }}
                        />
                        <h4 className="mt-3 text-lg font-semibold text-foreground">{selected.name}</h4>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {selected.description || "这个页面用于收集客户需求和联系方式。"}
                        </p>
                        <div className="mt-3 font-mono text-xs text-muted-foreground">/s/{selected.slug}</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">问题清单</div>
                        {selected.questions.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                            还没有配置问题，建议先补上需求参数、联系方式和项目背景字段。
                          </div>
                        ) : (
                          selected.questions.slice(0, 6).map((question, index) => (
                            <div
                              key={question.id}
                              className="rounded-xl border border-border bg-background px-3 py-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium text-foreground">
                                  {index + 1}. {question.label}
                                </div>
                                <Badge variant={question.required ? "warning" : "secondary"}>
                                  {question.required ? "必填" : "可选"}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                类型：{question.type}
                                {question.options?.length ? ` · 选项 ${question.options.length} 个` : ""}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Button asChild>
                          <Link href={`/dashboard/bots/landing/edit?id=${encodeURIComponent(selected.id)}`}>
                            编辑页面
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href={`/dashboard/bots/landing/edit?id=${encodeURIComponent(selected.id)}&tab=submissions`}>
                            查看提交记录
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/dashboard/bots/landing/mobile">手机端预览</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/dashboard/inquiries">查看关联询盘</Link>
                        </Button>
                      </div>
                    </div>
                  </aside>
                ) : null}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              当前显示 {isPreview ? "预览数据" : "正式数据"}。访问与转化统计将在数据中心汇总展示。
            </div>
          </>
        )}
      </div>
    </ConsolePage>
  );
}
