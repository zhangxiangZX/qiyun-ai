"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  HelpCircle,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { CustomerArchiveTabs } from "@/components/sales/customer-archive-tabs";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createInquiryOnApi,
  fetchCustomerRecommendations,
  listCustomerOpportunities,
  listInquiries,
  listQuoteOpportunities,
} from "@/lib/sales/api";
import {
  MOCK_CUSTOMER_OPPORTUNITIES,
  MOCK_QUOTE_OPPORTUNITIES,
  MOCK_RECOMMENDATIONS,
} from "@/lib/sales/customers-mock-data";
import { MOCK_INQUIRIES } from "@/lib/sales/mock-data";
import type {
  CustomerOpportunityItem,
  CustomerRecommendation,
  InquiryListItem,
  QuoteListItem,
} from "@/lib/sales/types";
import { QUOTE_STAGE_LABELS } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/customer-archive.module.css";

const PAGE_SIZE = 20;

const LOGO_GRADIENTS = [
  "linear-gradient(135deg,#64748b,#475569)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
  "linear-gradient(135deg,#1e293b,#0f172a)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  "linear-gradient(135deg,#ec4899,#db2777)",
];

const AVATAR_COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#22c55e", "#8b5cf6"];

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};

type LifecycleFilter = "all" | "potential" | "intent" | "won" | "lost";
type CustomerStage = "潜在客户" | "意向客户" | "成交客户" | "流失客户";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function logoGradient(name: string): string {
  return LOGO_GRADIENTS[hashString(name) % LOGO_GRADIENTS.length] ?? LOGO_GRADIENTS[0]!;
}

function avatarColor(ownerId: string | null): string {
  if (!ownerId) return "#94a3b8";
  return AVATAR_COLORS[hashString(ownerId) % AVATAR_COLORS.length] ?? "#3b82f6";
}

function parseContact(contact: string | null): { email: string; phone: string } {
  if (!contact) return { email: "—", phone: "" };
  const trimmed = contact.trim();
  if (trimmed.includes("@")) {
    const phoneMatch = trimmed.match(/1[3-9]\d{9}/);
    return {
      email: trimmed.split(/\s+/).find((part) => part.includes("@")) ?? trimmed,
      phone: phoneMatch?.[0] ?? "",
    };
  }
  return { email: "—", phone: trimmed };
}

function resolveStage(item: CustomerOpportunityItem): CustomerStage {
  if (item.lifecycleColumn === "won_or_repeat") return "成交客户";
  if (item.lifecycleColumn === "quoting") return "意向客户";
  if (item.lifecycleColumn === "silent_risk") return "流失客户";
  return "潜在客户";
}

function stageClass(stage: CustomerStage): string {
  if (stage === "成交客户") return styles.stageWon;
  if (stage === "意向客户") return styles.stageIntent;
  if (stage === "流失客户") return styles.stageLost;
  return styles.stagePotential;
}

function lifecycleFilterMatch(item: CustomerOpportunityItem, filter: LifecycleFilter): boolean {
  if (filter === "all") return true;
  const stage = resolveStage(item);
  if (filter === "potential") return stage === "潜在客户";
  if (filter === "intent") return stage === "意向客户";
  if (filter === "won") return stage === "成交客户";
  return stage === "流失客户";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function followUpHint(value: string | null): { label: string; className: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays === 0) return { label: "今天", className: styles.followUrgent };
  if (diffDays < 0) return { label: "待跟进", className: styles.followLater };
  if (diffDays <= 2) return { label: `${diffDays}天后`, className: styles.followLater };
  return null;
}

function quoteRef(quote: QuoteListItem | null): string {
  if (!quote) return "暂无报价/订单";
  const shortId = quote.id.slice(-8).toUpperCase();
  if (quote.stage === "won") return `订单 #SO-${shortId}`;
  return `报价 #Q-${shortId}`;
}

function quoteStatusDisplay(quote: QuoteListItem | null): {
  label: string;
  dotColor: string;
  statusClass: string;
} {
  if (!quote) {
    return { label: "—", dotColor: "#94a3b8", statusClass: styles.statusMuted };
  }
  const label = QUOTE_STAGE_LABELS[quote.stage] ?? quote.stageLabel;
  if (quote.stage === "won") {
    return { label: "已交付", dotColor: "#22c55e", statusClass: styles.statusGreen };
  }
  if (quote.stage === "quoted") {
    return { label: "已发送", dotColor: "#3b82f6", statusClass: styles.statusBlue };
  }
  if (quote.stage === "confirming") {
    return { label: "客户确认中", dotColor: "#f59e0b", statusClass: styles.statusAmber };
  }
  if (["to_quote", "engineering_review", "collecting"].includes(quote.stage)) {
    return { label: "报价中", dotColor: "#f59e0b", statusClass: styles.statusAmber };
  }
  if (quote.stage === "lost") {
    return { label: "已丢单", dotColor: "#94a3b8", statusClass: styles.statusMuted };
  }
  return { label, dotColor: "#8b5cf6", statusClass: styles.statusPurple };
}

function deriveTags(
  item: CustomerOpportunityItem,
  inquiry: InquiryListItem | undefined,
): Array<{ label: string; className: string }> {
  const tags: Array<{ label: string; className: string }> = [];
  if (inquiry?.intentLevel === "high") {
    tags.push({ label: "高潜力", className: styles.tagBlue });
  }
  if (item.lifecycleColumn === "won_or_repeat") {
    tags.push({ label: "重点客户", className: styles.tagPurple });
  }
  if (item.lifecycleColumn === "silent_risk") {
    tags.push({ label: "待跟进", className: styles.tagGray });
  } else if (item.nextFollowUpAt && Date.parse(item.nextFollowUpAt) <= Date.now()) {
    tags.push({ label: "待回访", className: styles.tagOrange });
  }
  return tags;
}

function ownerDisplay(ownerId: string | null): { name: string; initial: string } {
  if (!ownerId) return { name: "待分配", initial: "待" };
  return { name: "已分配", initial: ownerId.slice(-1).toUpperCase() };
}

function HealthDonut({
  total,
  healthy,
  warning,
  risk,
  unknown,
}: {
  total: number;
  healthy: number;
  warning: number;
  risk: number;
  unknown: number;
}) {
  const circumference = 2 * Math.PI * 50;
  const segments = [
    { value: healthy, color: "#22c55e" },
    { value: warning, color: "#f59e0b" },
    { value: risk, color: "#ef4444" },
    { value: unknown, color: "#cbd5e1" },
  ];
  let offset = 0;
  const arcs = segments.map((segment) => {
    const pct = total > 0 ? segment.value / total : 0;
    const dash = pct * circumference;
    const arc = {
      color: segment.color,
      dash,
      offset,
      rotation: total > 0 ? (offset / circumference) * 360 - 90 : -90,
    };
    offset += dash;
    return arc;
  });

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="14" />
      {arcs.map((arc, index) =>
        arc.dash > 0 ? (
          <circle
            key={index}
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={arc.color}
            strokeWidth="14"
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeLinecap="round"
            transform={`rotate(${arc.rotation} 60 60)`}
          />
        ) : null,
      )}
      <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1e293b">
        {total.toLocaleString("zh-CN")}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="11" fill="#64748b">
        客户总数
      </text>
    </svg>
  );
}

export function CustomersWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [items, setItems] = useState<CustomerOpportunityItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [recommendations, setRecommendations] = useState<CustomerRecommendation[]>([]);
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const [createdCustomers, setCreatedCustomers] = useState<CustomerOpportunityItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", company: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : true;
      if (preview) {
        // Preview mode (no upstream API): render demo data directly.
        setItems(MOCK_CUSTOMER_OPPORTUNITIES);
        setQuotes(MOCK_QUOTE_OPPORTUNITIES);
        setInquiries(MOCK_INQUIRIES);
        setRecommendations(MOCK_RECOMMENDATIONS);
        setLoading(false);
        return;
      }
      const results = await Promise.allSettled([
        listCustomerOpportunities(),
        listQuoteOpportunities(),
        listInquiries(),
        fetchCustomerRecommendations(),
      ]);
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") {
        setError(failed.reason);
      }
      setItems(results[0]?.status === "fulfilled" ? results[0].value : MOCK_CUSTOMER_OPPORTUNITIES);
      setQuotes(results[1]?.status === "fulfilled" ? results[1].value : MOCK_QUOTE_OPPORTUNITIES);
      setInquiries(results[2]?.status === "fulfilled" ? results[2].value : MOCK_INQUIRIES);
      setRecommendations(
        results[3]?.status === "fulfilled" ? results[3].value : MOCK_RECOMMENDATIONS,
      );
    } catch {
      setItems(MOCK_CUSTOMER_OPPORTUNITIES);
      setQuotes(MOCK_QUOTE_OPPORTUNITIES);
      setInquiries(MOCK_INQUIRIES);
      setRecommendations(MOCK_RECOMMENDATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const quoteByInquiry = useMemo(() => new Map(quotes.map((q) => [q.inquiryId, q])), [quotes]);
  const inquiryById = useMemo(() => new Map(inquiries.map((i) => [i.id, i])), [inquiries]);

  const displayItems = useMemo(() => [...createdCustomers, ...items], [createdCustomers, items]);

  const stats = useMemo(() => {
    const counts = { potential: 0, intent: 0, won: 0, lost: 0 };
    for (const item of displayItems) {
      const stage = resolveStage(item);
      if (stage === "潜在客户") counts.potential += 1;
      else if (stage === "意向客户") counts.intent += 1;
      else if (stage === "成交客户") counts.won += 1;
      else counts.lost += 1;
    }
    return { total: displayItems.length, ...counts };
  }, [displayItems]);

  const health = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let risk = 0;
    let unknown = 0;
    for (const item of displayItems) {
      if (item.lifecycleColumn === "won_or_repeat") healthy += 1;
      else if (item.lifecycleColumn === "silent_risk") risk += 1;
      else if (item.lifecycleColumn === "quoting" || item.lifecycleColumn === "collecting_requirements") {
        warning += 1;
      } else unknown += 1;
    }
    return { healthy, warning, risk, unknown };
  }, [displayItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return displayItems.filter((item) => {
      if (!lifecycleFilterMatch(item, lifecycleFilter)) return false;
      if (!query) return true;
      const inquiry = inquiryById.get(item.inquiryId);
      const contact = parseContact(item.customerContact);
      const haystack = [
        item.customerName,
        item.customerContact ?? "",
        contact.email,
        contact.phone,
        inquiry?.summary ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [displayItems, search, lifecycleFilter, inquiryById]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, lifecycleFilter]);

  const createCustomer = async () => {
    if (!form.name.trim()) return;
    const contact = [form.phone.trim(), form.company.trim()].filter(Boolean).join(" · ");
    setCreating(false);
    try {
      // Customers are derived from inquiries in the backend — create an inquiry
      const inquiry = await createInquiryOnApi({
        customerName: form.name.trim(),
        summary: contact || undefined,
      });
      setCreatedCustomers((prev) => [
        {
          id: inquiry.id,
          inquiryId: inquiry.id,
          quoteOpportunityId: null,
          customerName: form.name.trim(),
          customerContact: contact || null,
          stage: "none",
          lifecycleColumn: "awaiting_first_contact",
          ownerId: null,
          nextFollowUpAt: null,
          updatedAt: inquiry.updatedAt,
        },
        ...prev,
      ]);
      setForm({ name: "", phone: "", company: "" });
    } catch (error) {
      setCreateError(getApiErrorMessage(error, "创建失败，请稍后重试。"));
      setCreating(true);
    }
  };

  const repurchaseItems = useMemo(() => {
    return displayItems
      .filter((item) => item.lifecycleColumn === "won_or_repeat")
      .slice(0, 3)
      .map((item) => {
        const quote = quoteByInquiry.get(item.inquiryId);
        const hint = followUpHint(item.nextFollowUpAt);
        return { item, quote, hint };
      });
  }, [displayItems, quoteByInquiry]);

  const serviceItems = useMemo(() => {
    if (recommendations.length > 0) {
      return recommendations.slice(0, 3).map((rec) => ({
        id: rec.id,
        title: rec.title,
        detail: rec.detail,
      }));
    }
    return displayItems
      .filter((item) => item.lifecycleColumn === "quoting")
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        title: item.customerName,
        detail: "报价跟进中，建议主动回访",
      }));
  }, [recommendations, displayItems]);

  const updatedAt = useMemo(() => {
    if (displayItems.length === 0) return "—";
    const latest = displayItems.reduce((max, item) => {
      const t = Date.parse(item.updatedAt);
      return t > max ? t : max;
    }, 0);
    const d = new Date(latest);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [displayItems]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <CustomerArchiveTabs active="archive" />
          <p className={styles.loadingText}>正在加载客户档案…</p>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <CustomerArchiveTabs active="archive" />
          <ConsoleRequestError {...resolveRequestErrorPresentation(error, "无法加载客户档案数据。")} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <CustomerArchiveTabs active="archive" />

        <div className={styles.filterBar}>
          <label className={styles.filterSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="搜索客户名称 / 公司 / 邮箱 / 电话"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.filterSelect}
            onClick={() => {
              const order: LifecycleFilter[] = ["all", "potential", "intent", "won", "lost"];
              const idx = order.indexOf(lifecycleFilter);
              setLifecycleFilter(order[(idx + 1) % order.length] ?? "all");
            }}
          >
            <span>
              {lifecycleFilter === "all"
                ? "生命周期阶段"
                : lifecycleFilter === "potential"
                  ? "潜在客户"
                  : lifecycleFilter === "intent"
                    ? "意向客户"
                    : lifecycleFilter === "won"
                      ? "成交客户"
                      : "流失客户"}
            </span>
            <ChevronDown size={12} aria-hidden />
          </button>
          <button type="button" className={styles.filterSelect} title="V2开发中" disabled style={{ opacity: 0.5 }}>
            <span>客户标签</span>
            <ChevronDown size={12} aria-hidden />
          </button>
          <button type="button" className={styles.filterSelect} title="V2开发中" disabled style={{ opacity: 0.5 }}>
            <span>所属销售</span>
            <ChevronDown size={12} aria-hidden />
          </button>
          <button type="button" className={styles.filterSelect} title="V2开发中" disabled style={{ opacity: 0.5 }}>
            <span>更多筛选</span>
            <ChevronDown size={12} aria-hidden />
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => setCreating(true)} style={{ opacity: 0.6 }}>
            <Plus size={14} aria-hidden />
            新建客户
          </button>
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
              zIndex: 50,
              padding: 16,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                width: "100%",
                maxWidth: 420,
                padding: 20,
                boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              }}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>新建客户</h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                演示模式：创建的数据仅在本次会话内可见
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>客户名称</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="例如：华东制造"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>联系电话</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="例如：13800000000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>公司 / 行业</label>
                <input
                  style={INPUT_STYLE}
                  placeholder="例如：机械制造 / 冷水机"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  取消
                </button>
                <button type="button" className={styles.btnPrimary} onClick={createCustomer}>
                  创建
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <strong>全部客户</strong> {stats.total.toLocaleString("zh-CN")}
          </div>
          <div className={styles.statItem}>
            <span className={styles.statDot} style={{ background: "#3b82f6" }} />
            潜在客户 <strong>{stats.potential.toLocaleString("zh-CN")}</strong>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statDot} style={{ background: "#f59e0b" }} />
            意向客户 <strong>{stats.intent.toLocaleString("zh-CN")}</strong>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statDot} style={{ background: "#22c55e" }} />
            成交客户 <strong>{stats.won.toLocaleString("zh-CN")}</strong>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statDot} style={{ background: "#94a3b8" }} />
            流失客户 <strong>{stats.lost.toLocaleString("zh-CN")}</strong>
          </div>
        </div>

        <div className={styles.dataCard}>
          {filteredItems.length === 0 ? (
            <ConsoleEmptyState
              preset="noLeads"
              title="暂无客户"
              description="询盘与报价同步后将出现在客户档案中。"
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
                      <th>客户信息</th>
                      <th>生命周期阶段</th>
                      <th>最近订单报价状态</th>
                      <th>所属销售</th>
                      <th>下次跟进时间</th>
                      <th>客户标签</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => {
                      const stage = resolveStage(item);
                      const quote = quoteByInquiry.get(item.inquiryId) ?? null;
                      const inquiry = inquiryById.get(item.inquiryId);
                      const contact = parseContact(item.customerContact);
                      const status = quoteStatusDisplay(quote);
                      const owner = ownerDisplay(item.ownerId);
                      const followHint = followUpHint(item.nextFollowUpAt);
                      const tags = deriveTags(item, inquiry);
                      const initial = item.customerName.charAt(0) || "客";

                      return (
                        <tr key={item.id}>
                          <td>
                            <input type="checkbox" aria-label={`选择 ${item.customerName}`} style={{ width: 14, height: 14 }} />
                          </td>
                          <td>
                            <div className={styles.customerInfo}>
                              <div className={styles.customerLogo} style={{ background: logoGradient(item.customerName) }}>
                                {initial}
                              </div>
                              <div className={styles.customerMeta}>
                                <h4>{item.customerName}</h4>
                                <p>{contact.email}</p>
                                {contact.phone ? <p className={styles.phone}>{contact.phone}</p> : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.stageBadge} ${stageClass(stage)}`}>{stage}</span>
                          </td>
                          <td>
                            <div className={styles.orderStatus}>
                              <div className={styles.orderId}>{quoteRef(quote)}</div>
                              <div>
                                {quote ? (
                                  <>
                                    <span className={styles.orderDot} style={{ background: status.dotColor }} />
                                    <span className={status.statusClass}>{status.label}</span>
                                  </>
                                ) : (
                                  <span className={styles.statusMuted}>—</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.salesOwner}>
                              <span
                                className={styles.salesAvatar}
                                style={{ background: avatarColor(item.ownerId) }}
                              >
                                {owner.initial}
                              </span>
                              {owner.name}
                            </div>
                          </td>
                          <td>
                            <div className={styles.followDate}>
                              {formatDate(item.nextFollowUpAt)}
                              {followHint ? (
                                <>
                                  <br />
                                  <span className={followHint.className}>{followHint.label}</span>
                                </>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            {tags.map((tag) => (
                              <span key={tag.label} className={`${styles.tag} ${tag.className}`}>
                                {tag.label}
                              </span>
                            ))}
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <Link
                                href={`/dashboard/inquiries?highlight=${item.inquiryId}`}
                                className={styles.actionBtn}
                                title="查看询盘"
                              >
                                <MessageSquare size={14} aria-hidden />
                              </Link>
                              <Link
                                href={`/dashboard/customers/detail?id=${item.id}`}
                                className={styles.actionBtn}
                                title="查看详情"
                              >
                                <Eye size={14} aria-hidden />
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
                <span>共 {filteredItems.length.toLocaleString("zh-CN")} 条</span>
                <div className={styles.paginationRight}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    &lt;
                  </button>
                  {pageNumbers[0]! > 1 ? (
                    <>
                      <button type="button" className={styles.pageBtn} onClick={() => setPage(1)}>
                        1
                      </button>
                      {pageNumbers[0]! > 2 ? <span>…</span> : null}
                    </>
                  ) : null}
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
                      {pageNumbers[pageNumbers.length - 1]! < totalPages - 1 ? <span>…</span> : null}
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
                  <span>{PAGE_SIZE} 条/页</span>
                  <span>跳至</span>
                  <input
                    type="text"
                    className={styles.pageJumpInput}
                    value={jumpPage}
                    onChange={(event) => setJumpPage(event.target.value.replace(/\D/g, ""))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        const next = Number.parseInt(jumpPage, 10);
                        if (next >= 1 && next <= totalPages) setPage(next);
                      }
                    }}
                  />
                  <span>页</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <aside className={styles.sidebar}>
        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>
            <span>客户健康度概览</span>
            <HelpCircle size={16} color="#64748b" aria-hidden />
          </div>
          <div className={styles.updateTime}>更新时间：{updatedAt}</div>
          <div className={styles.healthChart}>
            <HealthDonut
              total={stats.total}
              healthy={health.healthy}
              warning={health.warning}
              risk={health.risk}
              unknown={health.unknown}
            />
            <div className={styles.healthLegend}>
              {[
                { label: "健康客户", value: health.healthy, color: "#22c55e" },
                { label: "预警客户", value: health.warning, color: "#f59e0b" },
                { label: "风险客户", value: health.risk, color: "#ef4444" },
                { label: "未知", value: health.unknown, color: "#cbd5e1" },
              ].map((row) => (
                <div key={row.label} className={styles.legendRow}>
                  <div className={styles.legendLeft}>
                    <span className={styles.legendDot} style={{ background: row.color }} />
                    {row.label}
                  </div>
                  <div>
                    <span className={styles.legendValue}>{row.value.toLocaleString("zh-CN")}</span>
                    <span className={styles.legendPct}>
                      ({stats.total > 0 ? ((row.value / stats.total) * 100).toFixed(1) : "0.0"}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.cardSectionTitle} style={{ marginTop: 16, marginBottom: 0 }}>
            <span />
            <button type="button" className={styles.cardSectionMore} title="V2开发中" disabled style={{ opacity: 0.5 }}>
              查看客户健康度分析 &gt;
            </button>
          </div>
        </section>

        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>
            <span>回购提醒</span>
            <button type="button" className={styles.cardSectionMore} title="V2开发中" disabled style={{ opacity: 0.5 }}>
              查看全部回购提醒 &gt;
            </button>
          </div>
          <p className={styles.cardSectionSubtitle}>
            待跟进回购客户 <strong>{repurchaseItems.length}</strong>
          </p>
          {repurchaseItems.length === 0 ? (
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>暂无回购提醒</p>
          ) : (
            repurchaseItems.map(({ item, quote, hint }) => (
              <div key={item.id} className={styles.reminderItem}>
                <div className={styles.reminderLogo} style={{ background: logoGradient(item.customerName) }}>
                  {item.customerName.charAt(0)}
                </div>
                <div className={styles.reminderMeta}>
                  <h5>{item.customerName}</h5>
                  <p>上次订单：{formatDate(quote?.updatedAt ?? item.updatedAt)}</p>
                </div>
                <div className={styles.reminderTag}>
                  预计回购
                  <br />
                  <span className={styles.reminderDay}>{hint?.label ?? "待安排"}</span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>
            <span>服务机会</span>
            <button type="button" className={styles.cardSectionMore} title="V2开发中" disabled style={{ opacity: 0.5 }}>
              查看全部服务机会 &gt;
            </button>
          </div>
          <p className={styles.cardSectionSubtitle}>
            潜在服务机会 <strong>{serviceItems.length}</strong>
          </p>
          {serviceItems.map((item) => (
            <div key={item.id} className={styles.opportunityItem}>
              <div className={styles.opportunityLogo} style={{ background: logoGradient(item.title) }}>
                {item.title.charAt(0)}
              </div>
              <div className={styles.opportunityMeta}>
                <h5>{item.title}</h5>
                <p>{item.detail}</p>
              </div>
              <div className={styles.opportunityTag}>建议跟进</div>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}
