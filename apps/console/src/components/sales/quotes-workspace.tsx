"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  FileText,
  HelpCircle,
  Plus,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import {
  Skeleton,
} from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createInquiryOnApi,
  createQuoteOpportunity,
  formatAmount,
  listInquiries,
  listQuoteOpportunities,
} from "@/lib/sales/api";
import type { InquiryListItem, QuoteListItem } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/quote-management.module.css";

const PAGE_SIZE = 10;

const FLAG_GRADIENTS = [
  "linear-gradient(180deg,#3b82f6,#fff,#ef4444)",
  "linear-gradient(180deg,#ef4444 50%,#fff 50%)",
  "linear-gradient(90deg,#22c55e 33%,#fff 33%,#22c55e 66%)",
  "linear-gradient(90deg,#000 33%,#ef4444 33%,#f59e0b 66%)",
  "linear-gradient(180deg,#f59e0b,#fff,#22c55e)",
  "linear-gradient(180deg,#3b82f6,#f59e0b)",
];

const AVATAR_COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#22c55e"];

const quoteInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function flagGradient(name: string): string {
  return FLAG_GRADIENTS[hashString(name) % FLAG_GRADIENTS.length] ?? FLAG_GRADIENTS[0]!;
}

function avatarColor(ownerId: string | null): string {
  if (!ownerId) return "#94a3b8";
  return AVATAR_COLORS[hashString(ownerId) % AVATAR_COLORS.length] ?? "#3b82f6";
}

function quoteNumber(id: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `QT-${date}-${id.slice(-4).toUpperCase()}`;
}

function inquiryNumber(id: string): string {
  return `INQ-${id.slice(-4).toUpperCase()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DisplayStatus = "草稿" | "已发送" | "待确认" | "谈判中" | "已成交" | "已失效";

function displayStatus(item: QuoteListItem): { label: DisplayStatus; className: string } {
  if (item.stage === "won") return { label: "已成交", className: styles.statusWon };
  if (item.stage === "lost") return { label: "已失效", className: styles.statusLost };
  if (item.stage === "confirming") return { label: "待确认", className: styles.statusConfirming };
  if (item.stage === "quoted" && item.quotedAmount) {
    return { label: "谈判中", className: styles.statusNegotiating };
  }
  if (item.stage === "quoted") return { label: "已发送", className: styles.statusSent };
  if (["collecting", "engineering_review", "to_quote"].includes(item.stage)) {
    return { label: "草稿", className: styles.statusDraft };
  }
  return { label: "草稿", className: styles.statusDraft };
}

function sentTime(item: QuoteListItem): string {
  if (["quoted", "confirming", "won", "lost"].includes(item.stage)) {
    return formatDateTime(item.updatedAt);
  }
  return "—";
}

function ownerDisplay(ownerId: string | null): { name: string; initial: string } {
  if (!ownerId) return { name: "待分配", initial: "待" };
  return { name: "已分配", initial: ownerId.slice(-1).toUpperCase() };
}

function MiniSparkline({ color, seed }: { color: string; seed: number }) {
  const points = Array.from({ length: 7 }, (_, i) => {
    const y = 10 + ((seed + i * 7) % 14);
    return `${i * 12},${y}`;
  }).join(" ");
  return (
    <svg className={styles.miniChart} viewBox="0 0 70 30" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QuoteFunnelSvg() {
  return (
    <svg width="120" height="180" viewBox="0 0 120 180" aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="qf1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#2563eb" /></linearGradient>
        <linearGradient id="qf2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
        <linearGradient id="qf3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient>
        <linearGradient id="qf4" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
        <linearGradient id="qf5" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#86efac" /><stop offset="100%" stopColor="#22c55e" /></linearGradient>
        <linearGradient id="qf6" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6ee7b7" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
      </defs>
      <polygon points="10,5 110,5 100,35 20,35" fill="url(#qf1)" />
      <polygon points="20,38 100,38 92,66 28,66" fill="url(#qf2)" />
      <polygon points="28,69 92,69 84,96 36,96" fill="url(#qf3)" />
      <polygon points="36,99 84,99 76,125 44,125" fill="url(#qf4)" />
      <polygon points="44,128 76,128 68,153 52,153" fill="url(#qf5)" />
      <polygon points="52,156 68,156 62,178 58,178" fill="url(#qf6)" />
    </svg>
  );
}

export function QuotesWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [items, setItems] = useState<QuoteListItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdQuotes, setCreatedQuotes] = useState<QuoteListItem[]>([]);
  const [form, setForm] = useState({ customerName: "", amount: "", validDays: "30" });

  const displayItems = useMemo(() => [...createdQuotes, ...items], [createdQuotes, items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([listQuoteOpportunities(), listInquiries()]);
    const failed = results.find((r) => r.status === "rejected");
    if (failed?.status === "rejected") setError(failed.reason);
    if (results[0]?.status === "fulfilled") setItems(results[0].value);
    if (results[1]?.status === "fulfilled") setInquiries(results[1].value);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const createQuote = async () => {
    if (!form.customerName.trim() || !form.amount.trim()) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const days = Number(form.validDays) || 30;
    setCreating(false);
    try {
      // Create an inquiry first, then create a quote from it
      const inquiry = await createInquiryOnApi({
        customerName: form.customerName.trim(),
        summary: `${form.customerName.trim()} 新报价方案`,
      });
      const quote = await createQuoteOpportunity({
        inquiryId: inquiry.id,
        title: `${form.customerName.trim()} 新报价方案`,
        estimatedAmount: amount,
      });
      const newQuote: QuoteListItem = {
        id: quote.id,
        inquiryId: inquiry.id,
        stage: quote.stage ?? "to_quote",
        stageLabel: quote.stageLabel ?? "待报价",
        title: quote.title ?? `${form.customerName.trim()} 新报价方案`,
        customerName: quote.customerName ?? form.customerName.trim(),
        customerContact: quote.customerContact ?? null,
        estimatedAmount: quote.estimatedAmount ?? amount,
        quotedAmount: quote.quotedAmount ?? null,
        wonAmount: quote.wonAmount ?? null,
        lostReason: quote.lostReason ?? null,
        quoteDueAt: quote.quoteDueAt ?? new Date(Date.now() + days * 86400000).toISOString(),
        ownerId: quote.ownerId ?? null,
        nextFollowUpAt: quote.nextFollowUpAt ?? null,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      };
      setCreatedQuotes((prev) => [newQuote, ...prev]);
      setForm({ customerName: "", amount: "", validDays: "30" });
    } catch (error) {
      setCreateError(getApiErrorMessage(error, "创建失败，请稍后重试。"));
      setCreating(true);
    }
  };

  const quotedInquiryIds = useMemo(() => new Set(items.map((i) => i.inquiryId)), [items]);

  const kpis = useMemo(() => {
    const pendingCreate =
      inquiries.filter((i) => !quotedInquiryIds.has(i.id)).length +
      displayItems.filter((q) => ["collecting", "to_quote", "engineering_review"].includes(q.stage)).length;
    const inProgress = displayItems.filter((q) =>
      ["quoted", "confirming", "engineering_review", "to_quote"].includes(q.stage),
    ).length;
    const pendingConfirm = displayItems.filter((q) => q.stage === "confirming").length;
    const wonAmount = displayItems.reduce((sum, q) => sum + (q.wonAmount ?? 0), 0);
    return { pendingCreate, inProgress, pendingConfirm, wonAmount, total: displayItems.length };
  }, [displayItems, inquiries, quotedInquiryIds]);

  const funnel = useMemo(() => {
    const created = displayItems.length || 1;
    const sent = displayItems.filter((q) => ["quoted", "confirming", "won", "lost"].includes(q.stage)).length;
    const confirming = displayItems.filter((q) => q.stage === "confirming").length;
    const negotiating = displayItems.filter((q) => q.stage === "quoted" && q.quotedAmount).length;
    const won = displayItems.filter((q) => q.stage === "won").length;
    const lost = displayItems.filter((q) => q.stage === "lost").length;
    const pct = (n: number) => (displayItems.length > 0 ? ((n / displayItems.length) * 100).toFixed(1) : "0.0");
    return [
      { label: "创建报价", value: items.length, pct: "100" },
      { label: "已发送", value: sent, pct: pct(sent) },
      { label: "待确认", value: confirming, pct: pct(confirming) },
      { label: "谈判中", value: negotiating, pct: pct(negotiating) },
      { label: "已成交", value: won, pct: pct(won) },
      { label: "已失效", value: lost, pct: pct(lost) },
    ];
  }, [displayItems, items]);

  const conversions = useMemo(() => {
    const created = Math.max(displayItems.length, 1);
    const sent = displayItems.filter((q) => ["quoted", "confirming", "won", "lost"].includes(q.stage)).length;
    const confirming = displayItems.filter((q) => q.stage === "confirming").length;
    const won = displayItems.filter((q) => q.stage === "won").length;
    const negotiating = displayItems.filter((q) => q.stage === "quoted").length;
    return {
      sendRate: ((sent / created) * 100).toFixed(1),
      confirmRate: sent > 0 ? ((confirming / sent) * 100).toFixed(1) : "0.0",
      negotiateRate: confirming > 0 ? ((negotiating / confirming) * 100).toFixed(1) : "0.0",
      winRate: negotiating > 0 ? ((won / negotiating) * 100).toFixed(1) : "0.0",
    };
  }, [displayItems]);

  const totalPages = Math.max(1, Math.ceil(displayItems.length / PAGE_SIZE));
  const pageItems = displayItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <p className={styles.loadingText}>正在加载报价数据…</p>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.main}>
        <ConsoleRequestError
          {...resolveRequestErrorPresentation(error, "无法加载报价列表。")}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.pageHeaderRow}>
          <div className={styles.pageTitle}>
            <h1>报价管理</h1>
            <p className={styles.pageSubtitle}>从询盘创建报价，跟踪发送、确认与成交</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/quotes/templates" className={styles.btn}>
              <FileText size={14} aria-hidden /> 报价模板
            </Link>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setCreating(true)}>
              <Plus size={14} aria-hidden /> 新建报价
            </button>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: "#eab308" }}>
              <FileText size={22} color="#fff" aria-hidden />
            </div>
            <div className={styles.kpiInfo}>
              <div className={styles.kpiLabel}>待创建报价 <HelpCircle size={12} color="#94a3b8" /></div>
              <div className={styles.kpiValue}>{kpis.pendingCreate}</div>
              <div className={styles.kpiTrend}>
                —
              </div>
            </div>
            <MiniSparkline color="#f59e0b" seed={kpis.pendingCreate} />
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: "#3b5eff" }}>
              <Send size={22} color="#fff" aria-hidden />
            </div>
            <div className={styles.kpiInfo}>
              <div className={styles.kpiLabel}>报价进行中 <HelpCircle size={12} color="#94a3b8" /></div>
              <div className={styles.kpiValue}>{kpis.inProgress}</div>
              <div className={styles.kpiTrend}>
                —
              </div>
            </div>
            <MiniSparkline color="#3b82f6" seed={kpis.inProgress} />
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: "#8b5cf6" }}>
              <Users size={22} color="#fff" aria-hidden />
            </div>
            <div className={styles.kpiInfo}>
              <div className={styles.kpiLabel}>待客户确认 <HelpCircle size={12} color="#94a3b8" /></div>
              <div className={styles.kpiValue}>{kpis.pendingConfirm}</div>
              <div className={styles.kpiTrend}>
                —
              </div>
            </div>
            <MiniSparkline color="#8b5cf6" seed={kpis.pendingConfirm} />
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: "#22c55e" }}>
              <Wallet size={22} color="#fff" aria-hidden />
            </div>
            <div className={styles.kpiInfo}>
              <div className={styles.kpiLabel}>已成交金额 <HelpCircle size={12} color="#94a3b8" /></div>
              <div className={`${styles.kpiValue} ${styles.kpiValueSm}`}>{formatAmount(kpis.wonAmount)}</div>
              <div className={styles.kpiTrend}>
                —
              </div>
            </div>
            <MiniSparkline color="#22c55e" seed={kpis.wonAmount} />
          </div>
        </div>

        <div className={styles.dataCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>报价单列表</div>
            <div className={styles.cardActions}>
              <span className={styles.listMeta}>{items.length.toLocaleString("zh-CN")} 条报价</span>
            </div>
          </div>

          {displayItems.length === 0 ? (
            <ConsoleEmptyState
              preset="noLeads"
              title="暂无报价机会"
              description="在询盘中心创建报价机会后，将在此统一管理。"
            />
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input type="checkbox" aria-label="全选" style={{ width: 14, height: 14 }} />
                      </th>
                      <th>报价单号</th>
                      <th>客户名称</th>
                      <th>关联询盘</th>
                      <th>产品/方案</th>
                      <th>报价金额</th>
                      <th>报价状态</th>
                      <th>创建人</th>
                      <th>发送时间</th>
                      <th>到期时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => {
                      const status = displayStatus(item);
                      const owner = ownerDisplay(item.ownerId);
                      const amount = item.quotedAmount ?? item.estimatedAmount;
                      return (
                        <tr key={item.id}>
                          <td>
                            <input type="checkbox" aria-label={`选择 ${item.title}`} style={{ width: 14, height: 14 }} />
                          </td>
                          <td>{quoteNumber(item.id)}</td>
                          <td>
                            <div className={styles.customerCell}>
                              <span className={styles.flag} style={{ background: flagGradient(item.customerName) }} />
                              <span>{item.customerName}</span>
                            </div>
                          </td>
                          <td>{inquiryNumber(item.inquiryId)}</td>
                          <td>{item.title}</td>
                          <td className={styles.amount}>{formatAmount(amount)}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span>
                          </td>
                          <td>
                            <span className={styles.creatorAvatar} style={{ background: avatarColor(item.ownerId) }}>
                              {owner.initial}
                            </span>
                            {owner.name}
                          </td>
                          <td className={sentTime(item) === "—" ? styles.muted : undefined}>{sentTime(item)}</td>
                          <td className={!item.quoteDueAt ? styles.muted : undefined}>{formatDate(item.quoteDueAt)}</td>
                          <td>
                            <div className={styles.rowActions}>
                              <Link href={`/dashboard/quotes/${item.id}`} className={styles.actionLink}>
                                查看
                              </Link>
                              <Link href={`/dashboard/quotes/${item.id}/preview`} className={styles.actionLink}>
                                预览
                              </Link>
                              <Link href={`/dashboard/quotes/${item.id}/customer`} className={styles.actionLink}>
                                客户页
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>共 {items.length.toLocaleString("zh-CN")} 条</span>
                <div className={styles.paginationRight}>
                  <span>{PAGE_SIZE} 条/页</span>
                  <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    &lt;
                  </button>
                  {pageNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={page === num ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                  {pageNumbers[pageNumbers.length - 1]! < totalPages ? (
                    <>
                      <span>…</span>
                      <button type="button" className={styles.pageBtn} onClick={() => setPage(totalPages)}>
                        {totalPages}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {creating ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setCreating(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              width: 420,
              maxWidth: "92vw",
              boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
              padding: "20px 24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>新建报价</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, color: "#475569" }}>客户名称</label>
                <input
                  style={quoteInputStyle}
                  placeholder="例如：华东制造"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, color: "#475569" }}>报价金额(元)</label>
                <input
                  style={quoteInputStyle}
                  type="number"
                  min={0}
                  placeholder="例如：120000"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, color: "#475569" }}>有效期(天)</label>
                <input
                  style={quoteInputStyle}
                  type="number"
                  min={1}
                  placeholder="例如：30"
                  value={form.validDays}
                  onChange={(e) => setForm((f) => ({ ...f, validDays: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", margin: "12px 0 0" }}>
              演示模式：创建的数据仅在本次会话内可见
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" className={styles.btn} onClick={() => setCreating(false)}>
                取消
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={{ opacity: 1 }} onClick={createQuote}>
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className={styles.sidebar}>
        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>
            <span>报价漏斗</span>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              本月 <ChevronDown size={12} style={{ display: "inline" }} />
            </span>
          </div>
          <div className={styles.funnelChart}>
            <QuoteFunnelSvg />
            <div className={styles.funnelData}>
              {funnel.map((row) => (
                <div key={row.label} className={styles.funnelRow}>
                  <span className={styles.funnelLabel}>{row.label}</span>
                  <div>
                    <span className={styles.funnelValue}>{row.value}</span>
                    <span className={styles.funnelPct}>({row.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>转化率</div>
          <div className={styles.conversionGrid}>
            <div className={styles.conversionItem}>
              <div className={styles.conversionValue}>{conversions.sendRate}%</div>
              <div className={styles.conversionLabel}>发送率</div>
            </div>
            <div className={styles.conversionItem}>
              <div className={styles.conversionValue}>{conversions.confirmRate}%</div>
              <div className={styles.conversionLabel}>确认率</div>
            </div>
            <div className={styles.conversionItem}>
              <div className={styles.conversionValue}>{conversions.negotiateRate}%</div>
              <div className={styles.conversionLabel}>谈判率</div>
            </div>
            <div className={styles.conversionItem}>
              <div className={styles.conversionValue}>{conversions.winRate}%</div>
              <div className={styles.conversionLabel}>成交率</div>
            </div>
          </div>
        </section>

        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>
            <span>待处理提醒</span>
          </div>
          {[
            { label: "待创建报价", count: kpis.pendingCreate, bg: "#fef3c7", color: "#f59e0b" },
            { label: "待客户确认", count: kpis.pendingConfirm, bg: "#ede9fe", color: "#8b5cf6" },
            { label: "即将到期", count: displayItems.filter((q) => q.quoteDueAt && Date.parse(q.quoteDueAt) - Date.now() < 86400000 * 3).length, bg: "#fee2e2", color: "#ef4444" },
          ].map((row) => (
            <div key={row.label} className={styles.reminderItem}>
              <div className={styles.reminderLeft}>
                <div className={styles.reminderIcon} style={{ background: row.bg }}>
                  <FileText size={14} color={row.color} aria-hidden />
                </div>
                <span className={styles.reminderText}>{row.label}</span>
              </div>
              <span className={styles.reminderCount}>{row.count}</span>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}
