"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Calendar,
  Download,
  FileText,
  Filter,
  Flame,
  Hourglass,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  ListTodo,
  UserPlus,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  buildInquiryListQuery,
  computeInquiryKpis,
  computeTabCounts,
  mapInquiryRowDisplay,
  matchesInquiryTab,
} from "@/lib/sales/inquiry-center-helpers";
import {
  defaultInquiryDateRange,
  exportInquiriesToCsv,
  filterInquiriesByDateRange,
} from "@/lib/sales/inquiry-export";
import { listInquiries } from "@/lib/sales/api";
import {
  INQUIRY_TABLE_ROWS,
  INQUIRY_TABS,
  QUICK_FILTERS,
  UNASSIGNED_ALERTS,
  type InquiryTabKey,
} from "@/lib/sales/inquiries-center-mock";
import { MOCK_INQUIRIES } from "@/lib/sales/mock-data";
import type { InquiryListItem, IntentLevel } from "@/lib/sales/types";
import styles from "@/styles/inquiry-center.module.css";

const KPI_ICONS = [
  <MessageSquare key="m" size={22} />,
  <Flame key="f" size={22} />,
  <Hourglass key="h" size={22} />,
  <FileText key="t" size={22} />,
];

function channelClass(tone: string) {
  if (tone === "google") return styles.channelGoogle;
  if (tone === "site") return styles.channelSite;
  if (tone === "social") return styles.channelSocial;
  if (tone === "expo") return styles.channelExpo;
  return styles.channelGoogle;
}

function statusClass(tone: string) {
  const map: Record<string, string> = {
    new: styles.statusNew,
    follow: styles.statusFollow,
    quote: styles.statusQuote,
    supplement: styles.statusSupplement,
    won: styles.statusWon,
    lost: styles.statusLost,
  };
  return `${styles.statusPill} ${map[tone] ?? styles.statusFollow}`;
}

function mapApiToRows(items: InquiryListItem[]) {
  if (!items.length) return [];
  return items.map((item, i) => {
    const mapped = mapInquiryRowDisplay(item, i);
    const demo = INQUIRY_TABLE_ROWS[i];
    if (!demo) return mapped;
    return {
      ...mapped,
      displayId: demo.displayId ?? mapped.displayId,
      channelLabel: demo.channelLabel ?? mapped.channelLabel,
      channelTone: demo.channelTone ?? mapped.channelTone,
      productNeed: demo.productNeed ?? mapped.productNeed,
    };
  });
}

export function InquiriesWorkspace() {
  const defaultRange = defaultInquiryDateRange();
  const [data, setData] = useState<InquiryListItem[]>(MOCK_INQUIRIES);
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [tab, setTab] = useState<InquiryTabKey>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [intentFilter, setIntentFilter] = useState<IntentLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : true;
      setIsPreview(preview);
      if (preview) {
        setData(MOCK_INQUIRIES);
        return;
      }
      const items = await listInquiries(buildInquiryListQuery({ tab, q: debouncedQuery }));
      setData(items);
    } catch {
      setData(MOCK_INQUIRIES);
      setIsPreview(true);
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => (isPreview ? mapApiToRows(MOCK_INQUIRIES) : mapApiToRows(data)), [data, isPreview]);
  const dateScoped = useMemo(
    () => filterInquiriesByDateRange(isPreview ? MOCK_INQUIRIES : data, dateFrom, dateTo),
    [data, isPreview, dateFrom, dateTo],
  );
  const kpis = useMemo(() => computeInquiryKpis(dateScoped), [dateScoped]);
  const tabs = useMemo(() => computeTabCounts(dateScoped), [dateScoped]);

  const filtered = useMemo(() => {
    const baseRows = isPreview ? mapApiToRows(MOCK_INQUIRIES) : mapApiToRows(data);
    return baseRows.filter((row) => {
      if (!matchesInquiryTab(row, tab)) return false;
      if (intentFilter !== "all" && row.intentLevel !== intentFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      const created = Date.parse(row.createdAt);
      const fromMs = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : Number.NEGATIVE_INFINITY;
      const toMs = dateTo ? Date.parse(`${dateTo}T23:59:59`) : Number.POSITIVE_INFINITY;
      if (Number.isFinite(created) && (created < fromMs || created > toMs)) return false;
      const q = debouncedQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        row.customerName.toLowerCase().includes(q) ||
        row.displayId.toLowerCase().includes(q) ||
        (row.productNeed ?? "").toLowerCase().includes(q)
      );
    });
  }, [debouncedQuery, tab, intentFilter, statusFilter, dateFrom, dateTo, data, isPreview]);

  function handleExport() {
    const source = filtered.map((row) => {
      const original = (isPreview ? MOCK_INQUIRIES : data).find((item) => item.id === row.id);
      return original ?? row;
    });
    if (!source.length) {
      setExportNotice("当前筛选条件下没有可导出的询盘。");
      return;
    }
    exportInquiriesToCsv(source);
    setExportNotice(`已导出 ${source.length} 条询盘记录。`);
  }

  function clearFilters() {
    const range = defaultInquiryDateRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    setIntentFilter("all");
    setStatusFilter("all");
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="询盘中心" />
        {exportNotice ? (
          <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>{exportNotice}</p>
        ) : null}
      </ConsolePageAlerts>

      <div>
        <div className={styles.filterBar}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={styles.filterItem}
              onClick={() => setShowFilters((open) => !open)}
            >
              <Calendar size={14} />
              {dateFrom} ~ {dateTo}
            </button>
            <button
              type="button"
              className={styles.filterItem}
              onClick={() => setShowFilters((open) => !open)}
            >
              <Filter size={14} />
              筛选{showFilters ? " ▴" : ""}
            </button>
          </div>
          <button type="button" className={styles.btnExport} style={{ marginLeft: "auto" }} onClick={handleExport}>
            <Download size={14} />
            导出
          </button>
        </div>

        {showFilters ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
              marginBottom: 16,
              padding: "12px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#64748b" }}>
              开始日期
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#64748b" }}>
              结束日期
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#64748b" }}>
              意向等级
              <select
                value={intentFilter}
                onChange={(e) => {
                  setIntentFilter(e.target.value as IntentLevel | "all");
                  setPage(1);
                }}
                style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
              >
                <option value="all">全部</option>
                <option value="high">高意向</option>
                <option value="medium">中意向</option>
                <option value="low">低意向</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#64748b" }}>
              状态
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | "open" | "closed");
                  setPage(1);
                }}
                style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
              >
                <option value="all">全部</option>
                <option value="open">进行中</option>
                <option value="closed">已关闭</option>
              </select>
            </label>
            <button type="button" className={styles.filterItem} onClick={clearFilters}>
              清除筛选
            </button>
          </div>
        ) : null}

        {loading ? (
          <>
            <div className={styles.kpiGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className={`${styles.skeleton} h-24`} />
              ))}
            </div>
            <Skeleton className={`${styles.skeleton} mt-4 h-96`} />
          </>
        ) : (
          <div className={styles.page}>
            <div className={styles.main}>
              <div className={styles.kpiGrid}>
                {kpis.map((kpi, i) => (
                  <div key={kpi.label} className={styles.kpiCard}>
                    <div className={styles.kpiIcon} style={{ background: kpi.color }}>
                      {KPI_ICONS[i]}
                    </div>
                    <div>
                      <div className={styles.kpiLabel}>{kpi.label}</div>
                      <div className={styles.kpiValue}>{kpi.value}</div>
                      {kpi.trend ? (
                        <div className={styles.kpiChange}>
                          较上期 {kpi.trend}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <span>询盘列表</span>
                  <button type="button" className={styles.cardTitleLink}>
                    <Settings size={14} style={{ display: "inline", verticalAlign: "middle" }} /> 自定义列
                  </button>
                </div>

                <div className={styles.tabBar}>
                  {(isPreview ? INQUIRY_TABS : tabs).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={tab === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                      onClick={() => {
                        setTab(t.key);
                        setPage(1);
                      }}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 16px 0",
                  }}
                >
                  <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
                    <Search
                      size={14}
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      id="inquiry-list-search"
                      type="search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="搜索客户、需求、询盘编号…"
                      aria-label="搜索询盘列表"
                      style={{
                        width: "100%",
                        height: 36,
                        padding: "0 12px 0 32px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox" aria-label="全选" />
                        </th>
                        <th>询盘编号</th>
                        <th>客户名称</th>
                        <th>来源渠道</th>
                        <th>产品需求</th>
                        <th>需求完整度</th>
                        <th>意向等级</th>
                        <th>状态</th>
                        <th>负责人</th>
                        <th>最近跟进</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input type="checkbox" aria-label={`选择 ${row.displayId}`} />
                          </td>
                          <td>
                            <Link href={`/dashboard/inquiries/${row.id}`} className={styles.actionLink}>
                              {row.displayId}
                            </Link>
                          </td>
                          <td>
                            <div className={styles.companyCell}>
                              <span className={styles.companyName}>{row.customerName}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.channelTag} ${channelClass(row.channelTone)}`}>
                              {row.channelLabel}
                            </span>
                          </td>
                          <td className={styles.productType}>{row.productNeed}</td>
                          <td>
                            {row.requirementCompleteness <= 0 ? (
                              <span className={styles.completenessEmpty} title="需求字段尚未补充">
                                待补充
                              </span>
                            ) : (
                              <div className={styles.completenessWrap}>
                                <div className={styles.completenessBar}>
                                  <div
                                    className={
                                      row.requirementCompleteness < 60
                                        ? `${styles.completenessFill} ${styles.completenessFillLow}`
                                        : styles.completenessFill
                                    }
                                    style={{ width: `${row.requirementCompleteness}%` }}
                                  />
                                </div>
                                <span className={styles.completenessPct}>{row.requirementCompleteness}%</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className={styles.intentCell}>
                              <span>
                                {row.intentLevel === "high" ? "高" : row.intentLevel === "medium" ? "中" : "低"}
                              </span>
                              <span>
                                {Array.from({ length: row.intentFlames }).map((_, i) => (
                                  <Flame key={i} size={12} fill="#f59e0b" color="#f59e0b" style={{ display: "inline" }} />
                                ))}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={statusClass(row.statusTone)}>{row.statusLabel}</span>
                          </td>
                          <td>
                            <div className={styles.owner}>
                              {row.ownerName !== "—" ? (
                                <>
                                  <span className={styles.ownerAvatar}>{row.ownerName.slice(0, 1)}</span>
                                  <span>{row.ownerName}</span>
                                </>
                              ) : (
                                <span className={styles.timeMuted}>待分配</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>{row.lastFollowUp}</div>
                            <div className={styles.timeMuted}>{row.lastFollowAgo}</div>
                          </td>
                          <td>
                            <Link href={`/dashboard/inquiries/${row.id}`} className={styles.actionLink}>
                              详情
                            </Link>
                            <button type="button" className={styles.actionLink} style={{ marginLeft: 8 }}>
                              跟进
                            </button>
                            <button type="button" className={styles.actionLink} style={{ marginLeft: 8, color: "#64748b" }}>
                              更多
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <span>
                    共 {filtered.length} 条{isPreview ? "（预览）" : ""}
                  </span>
                  <div className={styles.pageControls}>
                    <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      ‹
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      const n = i + 1;
                      return (
                        <button
                          key={n}
                          type="button"
                          className={page === n ? styles.pageBtnActive : styles.pageBtn}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      ›
                    </button>
                    <select
                      className={styles.pageSize}
                      defaultValue="10"
                      aria-label="每页显示数量"
                    >
                      <option>10 条/页</option>
                      <option>20 条/页</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.bottomBar}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>快速筛选</span>
                    <button type="button" className={styles.cardTitleLink} onClick={clearFilters}>
                      清除
                    </button>
                  </div>
                  <div className={styles.quickFilterRow}>
                    {QUICK_FILTERS.map((f) => (
                      <button key={f.label} type="button" className={styles.quickFilterChip}>
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.assignAlert}>
                  <div className={styles.assignAlertHead}>
                    <span>⚠ 待分配提醒</span>
                    <Link href="/dashboard/inquiries/assign" className={styles.actionLink}>
                      去分配 ›
                    </Link>
                  </div>
                  <div className={styles.assignList}>
                    {UNASSIGNED_ALERTS.map((a) => (
                      <div key={a.id} className={styles.assignCard}>
                        <div className={styles.assignCardId}>{a.id}</div>
                        <div className={styles.assignCardMeta}>{a.company}</div>
                        <div className={styles.assignCardMeta}>
                          {a.channel} · {a.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>待办事项</div>
                <div className={styles.todoList}>
                  <div className={styles.todoItem}>
                    <span className={`${styles.todoDot} ${styles.todoDotRed}`} />
                    <div>
                      <div className={styles.todoTitle}>浙江迅达 - 待发送报价单</div>
                      <div className={styles.todoMeta}>负责人：张伟</div>
                      <div className={`${styles.todoTime} ${styles.todoTimeRed}`}>逾期 2 小时</div>
                    </div>
                  </div>
                  <div className={styles.todoItem}>
                    <span className={`${styles.todoDot} ${styles.todoDotOrange}`} />
                    <div>
                      <div className={styles.todoTitle}>深圳云栈 - 待补充技术参数</div>
                      <div className={styles.todoMeta}>负责人：李娜</div>
                      <div className={styles.todoTime}>今天 18:00</div>
                    </div>
                  </div>
                  <div className={styles.todoItem}>
                    <span className={`${styles.todoDot} ${styles.todoDotBlue}`} />
                    <div>
                      <div className={styles.todoTitle}>广州恒越 - 待确认方案</div>
                      <div className={styles.todoMeta}>负责人：张伟</div>
                      <div className={`${styles.todoTime} ${styles.todoTimeBlue}`}>明天 10:00</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>快捷操作</div>
                <div className={styles.quickGrid}>
                  <Link href="/dashboard/quick-entry" className={styles.quickAction}>
                    <span className={styles.quickIcon} style={{ background: "#3b82f6" }}>
                      <Plus size={14} />
                    </span>
                    <span className={styles.quickText}>快速录入</span>
                  </Link>
                  <Link href="/dashboard/inquiries/new" className={styles.quickAction}>
                    <span className={styles.quickIcon} style={{ background: "#22c55e" }}>
                      <UserPlus size={14} />
                    </span>
                    <span className={styles.quickText}>新建询盘</span>
                  </Link>
                  <Link href="/dashboard/tasks" className={styles.quickAction}>
                    <span className={styles.quickIcon} style={{ background: "#f59e0b" }}>
                      <ListTodo size={14} />
                    </span>
                    <span className={styles.quickText}>跟进任务</span>
                  </Link>
                  <Link href="/dashboard/quotes/new" className={styles.quickAction}>
                    <span className={styles.quickIcon} style={{ background: "#8b5cf6" }}>
                      <FileText size={14} />
                    </span>
                    <span className={styles.quickText}>创建报价</span>
                  </Link>
                </div>
              </div>

              <Link href="/dashboard/conversations/test" className={styles.aiCard}>
                <span className={styles.aiAvatar}>
                  <Bot size={20} />
                </span>
                <div>
                  <div className={styles.aiTitle}>
                    AI 跟进建议
                    <span className={styles.aiBadge}>3</span>
                  </div>
                  <p className={styles.aiDesc}>有 3 条高意向询盘建议今日优先跟进，点击查看 AI 分析。</p>
                  <span className={styles.aiBtn}>
                    <Sparkles size={12} />
                    查看建议
                  </span>
                </div>
              </Link>
            </aside>
          </div>
        )}
      </div>
    </ConsolePage>
  );
}
