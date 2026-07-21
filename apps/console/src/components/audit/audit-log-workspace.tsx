"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Download, Search, Users, X, XCircle } from "lucide-react";
import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { isApiError } from "@/lib/api/errors";
import { listAuditLogs } from "@/lib/audit/api";
import {
  AUDIT_DISPLAY_ROWS,
  AUDIT_STATS,
  type AuditLogDisplayRow,
} from "@/lib/audit/audit-dashboard-mock";
import { computeAuditStats, mapAuditEntryToDisplayRow } from "@/lib/audit/map-display";
import { mockAuditLogs } from "@/lib/audit/mock-data";
import {
  AUDIT_MODULE_OPTIONS,
  getAuditActionLabel,
  getAuditModuleLabel,
  type AuditEntry,
} from "@/lib/audit/types";
import { loadWorkspaceMembers } from "@/lib/auth/members";

const PAGE_SIZE = 10;

function TrendBadge({ value, up }: { value: string; up: boolean }) {
  if (!value) return null;
  return (
    <span className={`text-xs font-medium ${up ? "text-red-600" : "text-emerald-600"}`}>
      较昨日 {value}
    </span>
  );
}

function DetailDrawer({
  row,
  onClose,
}: {
  row: AuditLogDisplayRow | null;
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <aside className="flex h-full w-full max-w-md flex-col bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">操作详情</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          <dl className="space-y-3">
            {[
              ["操作时间", row.time],
              ["操作用户", `${row.userName}（${row.userRole}）`],
              ["操作模块", row.module],
              ["操作类型", row.actionType],
              ["操作结果", row.result === "success" ? "成功" : "失败"],
              ["IP 地址", `${row.ip}${row.location ? ` · ${row.location}` : ""}`],
              ...(row.browser ? [["浏览器", row.browser] as const] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">操作内容</h3>
            <p className="rounded-lg border border-border bg-muted/30 p-3">{row.content}</p>
          </div>

          {row.changes?.length ? (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">变更对比</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">字段</th>
                    <th className="py-2 font-medium">更新前</th>
                    <th className="py-2 font-medium">更新后</th>
                  </tr>
                </thead>
                <tbody>
                  {row.changes.map((change) => (
                    <tr key={change.field} className="border-b border-border/50">
                      <td className="py-2">{change.field}</td>
                      <td className="py-2 text-muted-foreground">{change.before}</td>
                      <td className="py-2 text-emerald-600">{change.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">备注</h3>
            <p className="text-muted-foreground">{row.remark ?? "—"}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function enrichMockEntries(entries: AuditEntry[]): AuditEntry[] {
  return entries.map((entry) => ({
    ...entry,
    moduleLabel: getAuditModuleLabel(entry.module),
    actionLabel: getAuditActionLabel(entry.action),
    summary: `${getAuditModuleLabel(entry.module)} · ${getAuditActionLabel(entry.action)}`,
  }));
}

export function AuditLogWorkspace() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [rows, setRows] = useState<AuditLogDisplayRow[]>(AUDIT_DISPLAY_ROWS);
  const [stats, setStats] = useState(AUDIT_STATS);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof loadWorkspaceMembers>>>([]);
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLogDisplayRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : true;
      setIsPreview(preview);

      let nextEntries: AuditEntry[];
      let nextMembers: Awaited<ReturnType<typeof loadWorkspaceMembers>> = [];

      if (preview) {
        nextEntries = enrichMockEntries(mockAuditLogs);
      } else {
        try {
          nextMembers = await loadWorkspaceMembers();
        } catch {
          nextMembers = [];
        }
        nextEntries = await listAuditLogs({
          module: moduleFilter === "all" ? undefined : moduleFilter,
          limit: 200,
        });
      }

      setMembers(nextMembers);
      setEntries(nextEntries);
      setRows(nextEntries.map((entry) => mapAuditEntryToDisplayRow(entry, nextMembers)));
      setStats(computeAuditStats(nextEntries));
    } catch (nextError) {
      if (isApiError(nextError) && nextError.status === 403) {
        setError("仅企业管理员可查看操作日志。");
      } else {
        setError(
          nextError instanceof Error ? nextError.message : "操作日志加载失败，请稍后重试。",
        );
      }
      setEntries([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const actionOptions = useMemo(() => {
    const actions = new Set(entries.map((entry) => entry.action));
    return [...actions].sort().map((action) => ({
      value: action,
      label: getAuditActionLabel(action),
    }));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const entry = entries.find((item) => item.id === row.id);
      if (actionFilter !== "all" && entry?.action !== actionFilter) return false;
      if (userFilter !== "all" && entry?.userId !== userFilter) return false;
      if (!q) return true;
      return (
        row.userName.toLowerCase().includes(q) ||
        row.content.toLowerCase().includes(q) ||
        row.module.toLowerCase().includes(q) ||
        row.actionType.toLowerCase().includes(q)
      );
    });
  }, [rows, entries, actionFilter, userFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setModuleFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setQuery("");
    setPage(1);
  };

  return (
    <ConsolePage>
      <PageHeader
        variant="compact"
        title="操作日志"
        description="记录系统中所有用户的操作行为，支持按条件筛选和导出日志。"
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="操作日志" />
        {error ? <ConsoleRequestError message={error} onRetry={() => void load()} /> : null}
      </ConsolePageAlerts>

      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              emphasis="metric"
              label="操作总数"
              value={`${isPreview ? AUDIT_STATS.total.value : stats.total.value} 次`}
              icon={<Activity size={22} aria-hidden />}
              iconTone="brand"
              trend={<TrendBadge value={isPreview ? AUDIT_STATS.total.trend : stats.total.trend} up={stats.total.up} />}
            />
            <StatCard
              emphasis="metric"
              label="成功操作"
              value={`${isPreview ? AUDIT_STATS.success.value : stats.success.value} 次`}
              icon={<CheckCircle2 size={22} aria-hidden />}
              iconTone="success"
              trend={<TrendBadge value={isPreview ? AUDIT_STATS.success.trend : stats.success.trend} up={stats.success.up} />}
            />
            <StatCard
              emphasis="metric"
              label="失败操作"
              value={`${isPreview ? AUDIT_STATS.failure.value : stats.failure.value} 次`}
              icon={<XCircle size={22} aria-hidden />}
              iconTone="warning"
              trend={<TrendBadge value={isPreview ? AUDIT_STATS.failure.trend : stats.failure.trend} up={stats.failure.up} />}
            />
            <StatCard
              emphasis="metric"
              label="活跃用户"
              value={`${isPreview ? AUDIT_STATS.activeUsers.value : stats.activeUsers.value} 人`}
              icon={<Users size={22} aria-hidden />}
              iconTone="brand"
              trend={<TrendBadge value={isPreview ? AUDIT_STATS.activeUsers.trend : stats.activeUsers.trend} up={stats.activeUsers.up} />}
            />
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 grid gap-3 lg:grid-cols-6">
            <label className="text-sm lg:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">操作模块</span>
              <select
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                value={moduleFilter}
                onChange={(event) => {
                  setModuleFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">全部模块</option>
                {AUDIT_MODULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">操作用户</span>
              <select
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                value={userFilter}
                onChange={(event) => {
                  setUserFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">全部用户</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">操作类型</span>
              <select
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                value={actionFilter}
                onChange={(event) => {
                  setActionFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">全部类型</option>
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm lg:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">关键词</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-md border border-input py-2 pl-8 pr-3 text-sm"
                  placeholder="搜索用户、模块或操作内容"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" type="button" onClick={resetFilters}>
                重置
              </Button>
              <Button size="sm" type="button" onClick={() => void load()} disabled={loading}>
                查询
              </Button>
            </div>
            <Button variant="outline" size="sm" type="button" disabled>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              导出日志
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">操作时间</th>
                  <th className="px-4 py-3 font-medium">操作用户</th>
                  <th className="px-4 py-3 font-medium">用户角色</th>
                  <th className="px-4 py-3 font-medium">操作模块</th>
                  <th className="px-4 py-3 font-medium">操作类型</th>
                  <th className="px-4 py-3 font-medium">操作内容</th>
                  <th className="px-4 py-3 font-medium">操作结果</th>
                  <th className="px-4 py-3 font-medium">IP 地址</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-border/60">
                      <td colSpan={9} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      暂无操作日志记录
                    </td>
                  </tr>
                ) : (
                  paged.map((row) => (
                    <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.time}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {row.userAvatar}
                          </span>
                          {row.userName}
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.userRole}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{row.module}</Badge>
                      </td>
                      <td className="px-4 py-3">{row.actionType}</td>
                      <td className="max-w-[180px] truncate px-4 py-3">{row.content}</td>
                      <td className="px-4 py-3">
                        <span className={row.result === "success" ? "text-emerald-600" : "text-red-600"}>
                          {row.result === "success" ? "成功" : "失败"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{row.ip}</td>
                      <td className="px-4 py-3">
                        <button type="button" className="text-xs text-primary" onClick={() => setDetail(row)}>
                          详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>共 {filtered.length} 条记录</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
                上一页
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                下一页
              </Button>
            </div>
          </div>
        </section>
      </div>

      <DetailDrawer row={detail} onClose={() => setDetail(null)} />
    </ConsolePage>
  );
}
