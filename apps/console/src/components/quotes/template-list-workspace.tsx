"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Badge, Button, ConfirmDialog, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  deleteQuoteTemplate,
  listQuoteTemplates,
  setDefaultQuoteTemplate,
} from "@/lib/quotes/api";
import { mockQuoteTemplates } from "@/lib/quotes/template-mock-data";
import type { QuoteTemplate } from "@/lib/quotes/template-types";

type TemplateTab = "all" | "standard" | "industry" | "foreign";

const TEMPLATE_META: Record<
  string,
  { industry: string; type: TemplateTab; usage: number; pages: number; status: "enabled" | "draft" }
> = {
  "tpl-standard-blue": {
    industry: "通用设备、机械制造",
    type: "standard",
    usage: 1286,
    pages: 3,
    status: "enabled",
  },
  "tpl-light-green": {
    industry: "电子/科技行业",
    type: "industry",
    usage: 842,
    pages: 2,
    status: "enabled",
  },
  "tpl-dark-deep": {
    industry: "大型项目、集团客户",
    type: "standard",
    usage: 456,
    pages: 4,
    status: "enabled",
  },
  "tpl-amber-simple": {
    industry: "外贸出口",
    type: "foreign",
    usage: 312,
    pages: 2,
    status: "draft",
  },
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function tabLabel(tab: TemplateTab): string {
  if (tab === "all") return "全部模板";
  if (tab === "standard") return "标准模板";
  if (tab === "industry") return "行业模板";
  return "外贸模板";
}

export function TemplateListWorkspace() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuoteTemplate[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<QuoteTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TemplateTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      if (mode && isPreviewMode(mode)) {
        setItems(mockQuoteTemplates);
        setUsingMock(true);
        return;
      }
      const data = await listQuoteTemplates();
      setItems(data);
      setUsingMock(false);
    } catch (reason) {
      setItems([]);
      setUsingMock(false);
      setLoadError(reason instanceof Error ? reason.message : "报价模板加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((tpl) => (TEMPLATE_META[tpl.id]?.type ?? "standard") === tab);
  }, [items, tab]);

  const selected = useMemo(
    () => filtered.find((tpl) => tpl.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (filtered.length && !filtered.some((tpl) => tpl.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const handleSetDefault = async (id: string) => {
    if (usingMock) {
      setItems((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
      return;
    }
    const updated = await setDefaultQuoteTemplate(id);
    setItems((prev) =>
      prev.map((t) => ({ ...t, isDefault: t.id === updated.id ? updated.isDefault : false })),
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (!usingMock) await deleteQuoteTemplate(deleteTarget.id);
      setItems((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const selectedMeta = selected ? TEMPLATE_META[selected.id] : null;
  const latestTemplate = [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const defaultCount = items.filter((item) => item.isDefault).length;

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="报价模板管理" />
        {loadError ? <ConsoleRequestError message={loadError} onRetry={() => void loadItems()} /> : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        title="报价模板管理"
        description="统一管理报价单样式，新建报价时可一键套用。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/quotes">返回报价列表</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/quotes/templates/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                新建报价模板
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard emphasis="metric" label="模板总数" value={String(items.length)} description="当前工作区" icon={<FileText size={22} />} iconTone="brand" />
          <StatCard emphasis="metric" label="默认模板" value={String(defaultCount)} description={items.length ? `占比 ${((defaultCount / items.length) * 100).toFixed(1)}%` : "尚未设置"} icon={<Star size={22} />} iconTone="warning" />
          <StatCard emphasis="metric" label="本月使用次数" value="—" description="待接报价使用统计" icon={<Eye size={22} />} iconTone="success" />
          <StatCard emphasis="metric" label="最近更新" value={latestTemplate ? formatDate(latestTemplate.updatedAt).split(" ")[0] : "—"} description={latestTemplate?.templateName ?? "暂无模板"} icon={<Pencil size={22} />} iconTone="info" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {(["all", "standard", "industry", "foreign"] as TemplateTab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tab === key ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {tabLabel(key)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>全部行业</option>
            </select>
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>全部状态</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : filtered.length === 0 ? (
          <ConsoleEmptyState preset="noMatches" title="暂无报价模板" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">模板名称</th>
                      <th className="px-4 py-3 font-medium">适用行业</th>
                      <th className="px-4 py-3 font-medium">模板类型</th>
                      <th className="px-4 py-3 font-medium">使用次数</th>
                      <th className="px-4 py-3 font-medium">默认</th>
                      <th className="px-4 py-3 font-medium">更新时间</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tpl) => {
                      const meta = TEMPLATE_META[tpl.id];
                      const active = selected?.id === tpl.id;
                      return (
                        <tr
                          key={tpl.id}
                          className={`cursor-pointer border-b border-border/60 hover:bg-accent/30 ${active ? "bg-primary/5" : ""}`}
                          onClick={() => setSelectedId(tpl.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                                style={{ background: tpl.themeColor }}
                              >
                                <FileText className="h-4 w-4" />
                              </span>
                              <span className="font-medium text-foreground">{tpl.templateName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{meta?.industry ?? "通用行业"}</td>
                          <td className="px-4 py-3">{tabLabel(meta?.type ?? "standard")}</td>
                          <td className="px-4 py-3">{meta?.usage ?? 0}</td>
                          <td className="px-4 py-3">
                            {tpl.isDefault ? (
                              <Badge variant="default" className="gap-1 bg-amber-100 text-amber-700">
                                <Star className="h-3 w-3" /> 默认
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(tpl.updatedAt)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={meta?.status === "draft" ? "secondary" : "success"}>
                              {meta?.status === "draft" ? "草稿" : "启用"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/dashboard/quotes/templates/${tpl.id}/preview`}>预览</Link>
                              </Button>
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/dashboard/quotes/templates/${tpl.id}`}>编辑</Link>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selected ? (
              <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div
                  className="mb-4 aspect-[3/4] overflow-hidden rounded-xl border border-border"
                  style={{ background: `linear-gradient(180deg, ${selected.themeColor}22, #fff)` }}
                >
                  <div className="flex h-full flex-col p-4">
                    <div className="mb-3 h-8 rounded" style={{ background: selected.themeColor }} />
                    <div className="space-y-2">
                      <div className="h-3 w-2/3 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                      <div className="mt-4 h-24 rounded border border-border bg-white/80" />
                      <div className="h-3 w-full rounded bg-muted" />
                      <div className="h-3 w-5/6 rounded bg-muted" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{selected.templateName}</h3>
                  {selected.isDefault ? (
                    <Badge variant="default" className="bg-amber-100 text-amber-700">
                      默认模板
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{selected.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">页面数量</div>
                    <div className="font-semibold">{selectedMeta?.pages ?? 3} 页</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">字段数量</div>
                    <div className="font-semibold">{selected.fields.length} 个</div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">配色风格</div>
                    <div className="flex items-center gap-1 font-semibold">
                      <span className="h-3 w-3 rounded-full" style={{ background: selected.themeColor }} />
                      蓝色系
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <div className="text-muted-foreground">更新时间</div>
                    <div className="font-semibold">{formatDate(selected.updatedAt)}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={`/dashboard/quotes/templates/${selected.id}/preview`}>预览模板</Link>
                  </Button>
                  {!selected.isDefault ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => void handleSetDefault(selected.id)}>
                      设为默认
                    </Button>
                  ) : null}
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        icon="danger"
        title="删除报价模板"
        description={`确认删除模板「${deleteTarget?.templateName ?? ""}」？`}
        confirmLabel={deleting ? "删除中…" : "删除"}
        cancelLabel="取消"
        confirmLoading={deleting}
        size="md"
      />
    </ConsolePage>
  );
}
