"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Download,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  ShoppingCart,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { listCustomerOpportunities, listQuoteOpportunities } from "@/lib/sales/api";
import type { CustomerOpportunityItem, QuoteListItem } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/repurchase-reminders.module.css";

const PAGE_SIZE = 10;

const repurchaseInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 14,
  color: "#1e293b",
  outline: "none",
};

type TabId = "all" | "upcoming" | "overdue" | "reminded" | "converted";
type ReminderStatus = "overdue" | "upcoming" | "reminded" | "normal" | "converted";

interface HistoryOrder {
  orderNo: string;
  date: string;
  amount: number;
}

interface RepurchaseRow {
  id: string;
  customerName: string;
  industry: string;
  customerTags: string;
  avatarColor: string;
  productName: string;
  productModel: string;
  lastQuantity: number;
  lastPurchaseDate: string;
  orderNo: string;
  lastAmount: number;
  expectedRepurchaseDate: string;
  daysUntil: number;
  reminderStatus: ReminderStatus;
  ownerName: string;
  contactName: string;
  contactPhone: string;
  cooperationDuration: string;
  customerLevel: string;
  historyOrderCount: number;
  totalAmount: number;
  repurchaseProbability: number;
  avgCycleDays: number;
  daysSinceLastPurchase: number;
  followUpWindow: string;
  historyOrders: HistoryOrder[];
}

const AVATAR_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#ea580c"];
const OWNER_NAMES = ["张经理", "李销售", "王销售"];
const INDUSTRIES = ["通信设备制造", "机械设备制造", "新能源行业", "电子设备制造", "精密制造"];
const TAGS = ["高价值客户 · 年度采购", "活跃客户 · 批量采购", "重点客户", "稳定客户", "潜在客户"];

const DEMO_ROWS: RepurchaseRow[] = [
  {
    id: "demo-rep-1",
    customerName: "华东电力设备厂",
    industry: "电力设备制造",
    customerTags: "高价值客户 · 年度采购",
    avatarColor: "#2563eb",
    productName: "户外配电控制柜",
    productModel: "PD-CAB-32U",
    lastQuantity: 20,
    lastPurchaseDate: "2026-01-15",
    orderNo: "PO20260115001",
    lastAmount: 86000,
    expectedRepurchaseDate: "2026-07-25",
    daysUntil: 18,
    reminderStatus: "upcoming",
    ownerName: "张经理",
    contactName: "王建国",
    contactPhone: "+86 138 0011 2233",
    cooperationDuration: "3年2个月",
    customerLevel: "A级客户",
    historyOrderCount: 6,
    totalAmount: 520000,
    repurchaseProbability: 82,
    avgCycleDays: 190,
    daysSinceLastPurchase: 173,
    followUpWindow: "2026-07-18 ~ 2026-07-22",
    historyOrders: [
      { orderNo: "PO20260115001", date: "2026-01-15", amount: 86000 },
      { orderNo: "PO20240910002", date: "2024-09-10", amount: 72000 },
      { orderNo: "PO20240405003", date: "2024-04-05", amount: 64000 },
    ],
  },
  {
    id: "demo-rep-2",
    customerName: "华南新能源科技",
    industry: "新能源行业",
    customerTags: "活跃客户 · 批量采购",
    avatarColor: "#16a34a",
    productName: "充电桩柜体",
    productModel: "EV-CAB-24U",
    lastQuantity: 50,
    lastPurchaseDate: "2025-10-20",
    orderNo: "PO20251020007",
    lastAmount: 240000,
    expectedRepurchaseDate: "2026-06-20",
    daysUntil: -17,
    reminderStatus: "overdue",
    ownerName: "李销售",
    contactName: "陈晓",
    contactPhone: "+86 139 0022 3344",
    cooperationDuration: "2年8个月",
    customerLevel: "A级客户",
    historyOrderCount: 9,
    totalAmount: 1180000,
    repurchaseProbability: 76,
    avgCycleDays: 240,
    daysSinceLastPurchase: 260,
    followUpWindow: "2026-06-13 ~ 2026-06-17",
    historyOrders: [
      { orderNo: "PO20251020007", date: "2025-10-20", amount: 240000 },
      { orderNo: "PO20250218003", date: "2025-02-18", amount: 196000 },
      { orderNo: "PO20240812001", date: "2024-08-12", amount: 168000 },
    ],
  },
  {
    id: "demo-rep-3",
    customerName: "北方精密机械",
    industry: "机械设备制造",
    customerTags: "重点客户",
    avatarColor: "#ca8a04",
    productName: "工业控制柜",
    productModel: "IC-CAB-42U",
    lastQuantity: 12,
    lastPurchaseDate: "2026-03-10",
    orderNo: "PO20260310012",
    lastAmount: 132000,
    expectedRepurchaseDate: "2026-07-22",
    daysUntil: 15,
    reminderStatus: "reminded",
    ownerName: "王销售",
    contactName: "刘强",
    contactPhone: "+86 137 0033 4455",
    cooperationDuration: "4年1个月",
    customerLevel: "B级客户",
    historyOrderCount: 7,
    totalAmount: 760000,
    repurchaseProbability: 68,
    avgCycleDays: 135,
    daysSinceLastPurchase: 119,
    followUpWindow: "2026-07-15 ~ 2026-07-19",
    historyOrders: [
      { orderNo: "PO20260310012", date: "2026-03-10", amount: 132000 },
      { orderNo: "PO20251026008", date: "2025-10-26", amount: 118000 },
      { orderNo: "20250721005", date: "2025-07-21", amount: 96000 },
    ],
  },
  {
    id: "demo-rep-4",
    customerName: "中讯通信基站",
    industry: "通信设备制造",
    customerTags: "稳定客户",
    avatarColor: "#9333ea",
    productName: "通信基站机柜",
    productModel: "COM-CAB-36U",
    lastQuantity: 30,
    lastPurchaseDate: "2026-02-05",
    orderNo: "PO20260205003",
    lastAmount: 198000,
    expectedRepurchaseDate: "2026-08-15",
    daysUntil: 39,
    reminderStatus: "converted",
    ownerName: "张经理",
    contactName: "赵磊",
    contactPhone: "+86 136 0044 5566",
    cooperationDuration: "1年6个月",
    customerLevel: "B级客户",
    historyOrderCount: 4,
    totalAmount: 540000,
    repurchaseProbability: 91,
    avgCycleDays: 190,
    daysSinceLastPurchase: 152,
    followUpWindow: "2026-08-08 ~ 2026-08-12",
    historyOrders: [
      { orderNo: "PO20260205003", date: "2026-02-05", amount: 198000 },
      { orderNo: "PO20250711002", date: "2025-07-11", amount: 156000 },
      { orderNo: "PO20250108001", date: "2025-01-08", amount: 132000 },
    ],
  },
  {
    id: "demo-rep-5",
    customerName: "西部自动化",
    industry: "电子设备制造",
    customerTags: "潜在客户",
    avatarColor: "#0891b2",
    productName: "PLC 控制柜",
    productModel: "PLC-CAB-28U",
    lastQuantity: 8,
    lastPurchaseDate: "2026-04-22",
    orderNo: "PO20260422009",
    lastAmount: 64000,
    expectedRepurchaseDate: "2026-10-10",
    daysUntil: 95,
    reminderStatus: "normal",
    ownerName: "李销售",
    contactName: "孙宁",
    contactPhone: "+86 135 0055 6677",
    cooperationDuration: "1年2个月",
    customerLevel: "C级客户",
    historyOrderCount: 3,
    totalAmount: 210000,
    repurchaseProbability: 58,
    avgCycleDays: 170,
    daysSinceLastPurchase: 76,
    followUpWindow: "2026-10-03 ~ 2026-10-07",
    historyOrders: [
      { orderNo: "PO20260422009", date: "2026-04-22", amount: 64000 },
      { orderNo: "PO20251115006", date: "2025-11-15", amount: 58000 },
      { orderNo: "PO20250520004", date: "2025-05-20", amount: 48000 },
    ],
  },
];

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "全部提醒" },
  { id: "upcoming", label: "即将到期" },
  { id: "overdue", label: "已逾期" },
  { id: "reminded", label: "已提醒" },
  { id: "converted", label: "已转化" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDaysFromToday(target: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

function resolveReminderStatus(daysUntil: number, hash: number): ReminderStatus {
  if (hash % 17 === 0) return "converted";
  if (hash % 7 === 0 && daysUntil >= 0) return "reminded";
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 30) return "upcoming";
  return "normal";
}

function statusLabel(status: ReminderStatus): string {
  if (status === "overdue") return "已逾期";
  if (status === "upcoming") return "即将到期";
  if (status === "reminded") return "已提醒";
  if (status === "converted") return "已转化";
  return "正常";
}

function statusClass(status: ReminderStatus): string {
  if (status === "overdue") return styles.statusOverdue;
  if (status === "upcoming") return styles.statusUpcoming;
  if (status === "reminded") return styles.statusReminded;
  if (status === "converted") return styles.statusConverted;
  return styles.statusNormal;
}

function daysClass(daysUntil: number): string {
  if (daysUntil < 0) return styles.daysOverdue;
  if (daysUntil <= 30) return styles.daysUpcoming;
  return styles.daysNormal;
}

function buildHistoryOrders(baseDate: string, baseOrderNo: string, baseAmount: number, count: number): HistoryOrder[] {
  const orders: HistoryOrder[] = [];
  const start = new Date(baseDate);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setMonth(d.getMonth() - i * 3);
    const amount = Math.round(baseAmount * (1 + (i % 3) * 0.08));
    orders.push({
      orderNo: i === 0 ? baseOrderNo : baseOrderNo.replace(/\d+$/, (n) => String(Number(n) - i).padStart(3, "0")),
      date: formatDate(d),
      amount,
    });
  }
  return orders;
}

function buildRowFromApi(item: CustomerOpportunityItem, quote: QuoteListItem | undefined): RepurchaseRow {
  const hash = hashString(item.id);
  const cycleDays = 150 + (hash % 61);
  const lastPurchase = new Date(quote?.updatedAt ?? item.updatedAt);
  const expected = new Date(lastPurchase);
  expected.setDate(expected.getDate() + cycleDays);
  const daysUntil = diffDaysFromToday(expected);
  const reminderStatus = resolveReminderStatus(daysUntil, hash);
  const amount = quote?.wonAmount ?? quote?.quotedAmount ?? quote?.estimatedAmount ?? 30000 + (hash % 80000);
  const orderNo = `PO${formatDate(lastPurchase).replace(/-/g, "")}${String(hash % 1000).padStart(3, "0")}`;
  const productName = quote?.title ?? "定制产品";
  const modelSuffix = String(hash % 100).padStart(2, "0");
  const historyCount = 3 + (hash % 6);

  return {
    id: item.id,
    customerName: item.customerName,
    industry: INDUSTRIES[hash % INDUSTRIES.length] ?? INDUSTRIES[0]!,
    customerTags: TAGS[hash % TAGS.length] ?? TAGS[0]!,
    avatarColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!,
    productName,
    productModel: `${productName.slice(0, 2).toUpperCase()}-${modelSuffix}C-${32 + (hash % 20)}U`,
    lastQuantity: 5 + (hash % 20),
    lastPurchaseDate: formatDate(lastPurchase),
    orderNo,
    lastAmount: amount,
    expectedRepurchaseDate: formatDate(expected),
    daysUntil,
    reminderStatus,
    ownerName: OWNER_NAMES[hash % OWNER_NAMES.length] ?? OWNER_NAMES[0]!,
    contactName: item.customerContact?.split(/\s+/)[0] ?? "联系人",
    contactPhone: item.customerContact?.match(/1[3-9]\d{9}/)?.[0] ?? "+86 138 0000 0000",
    cooperationDuration: `${1 + (hash % 4)}年${hash % 12}个月`,
    customerLevel: hash % 3 === 0 ? "A级客户" : hash % 3 === 1 ? "B级客户" : "C级客户",
    historyOrderCount: historyCount,
    totalAmount: Math.round(amount * (2.5 + (hash % 5))),
    repurchaseProbability: 55 + (hash % 40),
    avgCycleDays: cycleDays,
    daysSinceLastPurchase: daysBetween(lastPurchase, new Date()),
    followUpWindow: `${formatDate(new Date(expected.getTime() - 7 * 86400000))} ~ ${formatDate(new Date(expected.getTime() - 3 * 86400000))}`,
    historyOrders: buildHistoryOrders(formatDate(lastPurchase), orderNo, amount, Math.min(5, historyCount)),
  };
}

function mergeRows(apiRows: RepurchaseRow[]): RepurchaseRow[] {
  if (apiRows.length === 0) return DEMO_ROWS;
  const names = new Set(apiRows.map((row) => row.customerName));
  const extras = DEMO_ROWS.filter((row) => !names.has(row.customerName));
  return [...apiRows, ...extras];
}

function tabMatch(row: RepurchaseRow, tab: TabId): boolean {
  if (tab === "all") return true;
  if (tab === "upcoming") return row.reminderStatus === "upcoming";
  if (tab === "overdue") return row.reminderStatus === "overdue";
  if (tab === "reminded") return row.reminderStatus === "reminded";
  return row.reminderStatus === "converted";
}

function buildTaskRow(customer: string, content: string, planTime: string): RepurchaseRow {
  const planned = new Date(planTime);
  const daysUntil = Number.isNaN(planned.getTime()) ? 0 : diffDaysFromToday(planned);
  const hash = hashString(`${customer}-${content}`);
  const reminderStatus = resolveReminderStatus(daysUntil, hash);
  return {
    id: crypto.randomUUID(),
    customerName: customer,
    industry: "—",
    customerTags: "新建跟进任务",
    avatarColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!,
    productName: content,
    productModel: "—",
    lastQuantity: 0,
    lastPurchaseDate: "—",
    orderNo: `TASK-${formatDate(new Date()).replace(/-/g, "")}-${String(hash % 1000).padStart(3, "0")}`,
    lastAmount: 0,
    expectedRepurchaseDate: formatDate(planned),
    daysUntil,
    reminderStatus,
    ownerName: OWNER_NAMES[hash % OWNER_NAMES.length] ?? OWNER_NAMES[0]!,
    contactName: "—",
    contactPhone: "—",
    cooperationDuration: "—",
    customerLevel: "新建",
    historyOrderCount: 0,
    totalAmount: 0,
    repurchaseProbability: 0,
    avgCycleDays: 0,
    daysSinceLastPurchase: 0,
    followUpWindow: `计划跟进：${formatDate(planned)}`,
    historyOrders: [],
  };
}

function PurchaseCycleChart({ avgCycle }: { avgCycle: number }) {
  const points = [avgCycle, avgCycle, avgCycle, avgCycle, avgCycle];
  const labels = ["2024-01", "2024-04", "2024-07", "2024-10", "2025-01"];
  const xs = [20, 60, 100, 140, 180, 220];
  const ys = points.map((p) => 80 - (p - 150) * 0.5);
  const polyline = xs.slice(0, 5).map((x, i) => `${x},${ys[i]}`).join(" ");

  return (
    <svg viewBox="0 0 240 100" className={styles.cycleChart} aria-hidden>
      <line x1="20" y1="80" x2="220" y2="80" stroke="#e2e8f0" strokeWidth="1" />
      <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2" />
      {xs.slice(0, 5).map((x, i) => (
        <circle key={x} cx={x} cy={ys[i]} r="3" fill="#3b82f6" />
      ))}
      {labels.map((label, i) => (
        <text key={label} x={xs[i]} y="95" fontSize="9" fill="#94a3b8" textAnchor="middle">
          {label}
        </text>
      ))}
      {points.slice(1, 4).map((p, i) => (
        <text key={`pt-${i}`} x={xs[i + 1]! - 15} y={ys[i + 1]! - 8} fontSize="9" fill="#3b82f6">
          {p}天
        </text>
      ))}
      <text x="120" y="12" fontSize="9" fill="#64748b" textAnchor="middle">
        平均周期 {avgCycle} 天
      </text>
    </svg>
  );
}

function SidebarDetail({ row, onCreateTask }: { row: RepurchaseRow; onCreateTask: () => void }) {
  return (
    <>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>客户详情</h3>
        <div className={styles.detailHeader}>
          <div className={styles.avatar} style={{ background: row.avatarColor, width: 40, height: 40 }}>
            {row.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4>{row.customerName}</h4>
            <span className={styles.tagBlue}>{row.customerTags.split(" · ")[0]}</span>
          </div>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>所属行业</span>
          <span className={styles.detailValue}>{row.industry}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>合作时长</span>
          <span className={styles.detailValue}>{row.cooperationDuration}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>联系人</span>
          <span className={styles.detailValue}>{row.contactName}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>联系电话</span>
          <span className={styles.detailValue}>{row.contactPhone}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>客户等级</span>
          <span className={styles.detailValue}>{row.customerLevel}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>历史订单</span>
          <span className={styles.detailValue}>{row.historyOrderCount}次</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>累计金额</span>
          <span className={styles.detailValue}>{formatCurrency(row.totalAmount)}</span>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>复购预测</h3>
        <div className={styles.predGrid}>
          <div className={styles.predBox}>
            <div className={styles.predLabel}>预计复购时间</div>
            <div className={styles.predValue}>{row.expectedRepurchaseDate}</div>
          </div>
          <div className={styles.predBox}>
            <div className={styles.predLabel}>复购概率</div>
            <div className={styles.predProb}>{row.repurchaseProbability}%</div>
            <span className={styles.tagGreen}>{row.repurchaseProbability >= 70 ? "高概率" : "中概率"}</span>
          </div>
        </div>
        <div className={styles.bigMetric}>
          <div className={styles.bigMetricLabel}>距上次购买</div>
          <div className={styles.bigMetricValue}>{row.daysSinceLastPurchase} 天</div>
        </div>
        <div className={styles.bigMetricLabel}>推荐跟进时间</div>
        <div className={styles.predValue}>{row.followUpWindow}</div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>购买周期分析</h3>
        <div className={styles.cellMuted} style={{ marginBottom: 8 }}>
          平均购买周期 <strong style={{ color: "#1e293b" }}>{row.avgCycleDays} 天</strong>
        </div>
        <PurchaseCycleChart avgCycle={row.avgCycleDays} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3>历史订单</h3>
          <button type="button" className={styles.cardLink}>
            查看全部
          </button>
        </div>
        {row.historyOrders.map((order) => (
          <div key={order.orderNo} className={styles.orderItem}>
            <div>
              <div className={styles.cellPrimary}>{order.orderNo}</div>
              <div className={styles.cellMuted}>{order.date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={styles.cellPrimary}>{formatCurrency(order.amount)}</div>
              <span className={styles.tagGreen}>已完成</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sidebarActions}>
        <button type="button" className={styles.btnPrimary}>
          <Send size={14} aria-hidden />
          发送提醒
        </button>
        <button type="button" className={styles.btnSecondary} onClick={onCreateTask}>
          <Plus size={14} aria-hidden />
          创建跟进任务
        </button>
      </div>
    </>
  );
}

export function RepurchaseRemindersWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [rows, setRows] = useState<RepurchaseRow[]>(DEMO_ROWS);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_ROWS[0]?.id ?? null);
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [recentlyCreatedId, setRecentlyCreatedId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ customer: "", content: "", planTime: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([listCustomerOpportunities(), listQuoteOpportunities()]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") {
      setError(failed.reason);
    }
    if (results[0]?.status === "fulfilled" && results[1]?.status === "fulfilled") {
      const items = results[0].value;
      const quotes = results[1].value;
      const quoteByInquiry = new Map(quotes.map((q) => [q.inquiryId, q]));
      const apiRows = items
        .filter((item) => item.lifecycleColumn === "won_or_repeat")
        .map((item) => buildRowFromApi(item, quoteByInquiry.get(item.inquiryId)));
      const merged = mergeRows(apiRows);
      setRows(merged);
      setSelectedId((prev) => (prev && merged.some((row) => row.id === prev) ? prev : merged[0]?.id ?? null));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = {
      all: rows.length,
      upcoming: 0,
      overdue: 0,
      reminded: 0,
      converted: 0,
    };
    for (const row of rows) {
      if (row.reminderStatus === "upcoming") counts.upcoming += 1;
      if (row.reminderStatus === "overdue") counts.overdue += 1;
      if (row.reminderStatus === "reminded") counts.reminded += 1;
      if (row.reminderStatus === "converted") counts.converted += 1;
    }
    return counts;
  }, [rows]);

  const kpis = useMemo(() => {
    const upcoming = rows.filter((row) => row.reminderStatus === "upcoming").length;
    const overdue = rows.filter((row) => row.reminderStatus === "overdue").length;
    const converted = rows.filter((row) => row.reminderStatus === "converted").length;
    return {
      total: rows.length,
      upcoming,
      overdue,
      convertedThisMonth: converted || Math.max(1, Math.round(rows.length * 0.18)),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = (search || filterSearch).trim().toLowerCase();
    return rows.filter((row) => {
      if (!tabMatch(row, activeTab)) return false;
      if (statusFilter !== "all" && row.reminderStatus !== statusFilter) return false;
      if (!query) return true;
      return (
        row.customerName.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        row.orderNo.toLowerCase().includes(query)
      );
    });
  }, [rows, activeTab, search, filterSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 5);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? pageRows[0] ?? rows[0] ?? null,
    [rows, selectedId, pageRows],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, filterSearch, statusFilter]);

  const createTask = () => {
    if (!taskForm.customer.trim() || !taskForm.content.trim() || !taskForm.planTime) return;
    const newRow = buildTaskRow(taskForm.customer.trim(), taskForm.content.trim(), taskForm.planTime);
    setRows((current) => [newRow, ...current]);
    setRecentlyCreatedId(newRow.id);
    setTaskForm({ customer: "", content: "", planTime: "" });
    setCreatingTask(false);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载复购提醒…</p>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className={styles.page}>
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "无法加载复购提醒数据。")} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeaderRow}>
        <div>
          <p>基于客户购买周期和历史订单，智能提醒销售跟进，提升复购转化率</p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.headerSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="搜索客户名称、产品名称、订单号..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button type="button" className={styles.btnOutline}>
            <Download size={14} aria-hidden />
            导出提醒数据
          </button>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>
            <Bell size={22} aria-hidden />
          </div>
          <div>
            <div className={styles.kpiLabel}>提醒客户</div>
            <div className={styles.kpiValue}>{kpis.total}</div>
            <div className={styles.kpiChange}>↑ +18.7% 较上月</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconYellow}`}>
            <ChevronDown size={22} style={{ transform: "rotate(-90deg)" }} aria-hidden />
          </div>
          <div>
            <div className={styles.kpiLabel}>即将到期 (30天内)</div>
            <div className={styles.kpiValue}>{kpis.upcoming}</div>
            <div className={styles.kpiChange}>↑ +12.3% 较上月</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconRed}`}>
            <AlertTriangle size={22} aria-hidden />
          </div>
          <div>
            <div className={styles.kpiLabel}>已逾期 (超过30天)</div>
            <div className={styles.kpiValue}>{kpis.overdue}</div>
            <div className={`${styles.kpiChange} ${styles.kpiChangeDown}`}>↑ +25.6% 较上月</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
            <ShoppingCart size={22} aria-hidden />
          </div>
          <div>
            <div className={styles.kpiLabel}>本月复购订单</div>
            <div className={styles.kpiValue}>{kpis.convertedThisMonth}</div>
            <div className={styles.kpiChange}>↑ +20.0% 较上月</div>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <div className={styles.tabRow}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  <span className={styles.tabCount}>({tabCounts[tab.id]})</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`${styles.card} ${styles.filterBar}`}>
            <select className={styles.filterSelect} defaultValue="all">
              <option value="all">全部产品</option>
            </select>
            <select className={styles.filterSelect} defaultValue="all">
              <option value="all">全部客户标签</option>
            </select>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">提醒状态：全部</option>
              <option value="overdue">已逾期</option>
              <option value="upcoming">即将到期</option>
              <option value="reminded">已提醒</option>
              <option value="normal">正常</option>
              <option value="converted">已转化</option>
            </select>
            <label className={styles.filterSearch}>
              <Search size={14} aria-hidden />
              <input
                type="search"
                placeholder="搜索客户名称、产品名称、订单号..."
                value={filterSearch}
                onChange={(event) => setFilterSearch(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={styles.btnReset}
              onClick={() => {
                setFilterSearch("");
                setStatusFilter("all");
              }}
            >
              重置
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" aria-label="全选" />
                    </th>
                    <th>客户信息</th>
                    <th>产品信息</th>
                    <th>上次购买</th>
                    <th>预计复购时间</th>
                    <th>距离天数</th>
                    <th>提醒状态</th>
                    <th>负责人</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>
                        暂无复购提醒
                      </td>
                    </tr>
                  )}
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className={[selectedId === row.id ? styles.rowSelected : "", recentlyCreatedId === row.id ? "ui-row-highlight" : ""].filter(Boolean).join(" ")}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" aria-label={`选择 ${row.customerName}`} />
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <div className={styles.avatar} style={{ background: row.avatarColor }}>
                            {row.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={styles.cellPrimary}>{row.customerName}</div>
                            <div className={styles.cellMuted}>{row.industry}</div>
                            <div className={styles.cellMuted}>{row.customerTags}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellPrimary}>{row.productName}</div>
                        <div className={styles.cellMuted}>型号：{row.productModel}</div>
                        <div className={styles.cellMuted}>上次采购：{row.lastQuantity}台</div>
                      </td>
                      <td>
                        <div className={styles.cellPrimary}>{row.lastPurchaseDate}</div>
                        <div className={styles.cellMuted}>订单号：{row.orderNo}</div>
                        <div className={styles.cellPrimary}>{formatCurrency(row.lastAmount)}</div>
                      </td>
                      <td>
                        <div className={styles.cellPrimary}>{row.expectedRepurchaseDate}</div>
                      </td>
                      <td>
                        <span className={daysClass(row.daysUntil)}>
                          {row.daysUntil} 天
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass(row.reminderStatus)}`}>
                          {statusLabel(row.reminderStatus)}
                        </span>
                      </td>
                      <td>{row.ownerName}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <button type="button" className={`${styles.actionBtn} ${styles.actionPhone}`} aria-label="电话联系">
                          <Phone size={14} />
                        </button>
                        <button type="button" className={`${styles.actionBtn} ${styles.actionMore}`} aria-label="更多操作">
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>共 {filteredRows.length} 条记录</span>
              <div className={styles.paginationRight}>
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
                {totalPages > 5 ? <span>…</span> : null}
                {totalPages > 5 ? (
                  <button type="button" className={styles.pageBtn} onClick={() => setPage(totalPages)}>
                    {totalPages}
                  </button>
                ) : null}
                <select
                  className={styles.pageSelect}
                  value={PAGE_SIZE}
                  onChange={() => undefined}
                  aria-label="每页条数"
                >
                  <option value={10}>10 条/页</option>
                </select>
                <span>跳至</span>
                <input
                  className={styles.pageJump}
                  value={jumpPage}
                  onChange={(event) => setJumpPage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      const next = Number.parseInt(jumpPage, 10);
                      if (!Number.isNaN(next) && next >= 1 && next <= totalPages) setPage(next);
                    }
                  }}
                  aria-label="跳转页码"
                />
                <span>页</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidebarCol}>
          {selectedRow ? (
            <SidebarDetail row={selectedRow} onCreateTask={() => setCreatingTask(true)} />
          ) : (
            <div className={styles.emptySidebar}>请选择客户查看详情</div>
          )}
        </div>
      </div>

      {creatingTask ? (
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
              maxWidth: 460,
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "#1e293b" }}>创建跟进任务</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#94a3b8" }}>
              演示模式：创建的数据仅在本次会话内可见
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#475569" }}>
                客户 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={repurchaseInputStyle}
                value={taskForm.customer}
                onChange={(e) => setTaskForm((f) => ({ ...f, customer: e.target.value }))}
                placeholder="例如：华东制造"
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#475569" }}>
                任务内容 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                rows={3}
                style={{ ...repurchaseInputStyle, resize: "vertical" }}
                value={taskForm.content}
                onChange={(e) => setTaskForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="例如：发送新品选型手册并确认预算"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#475569" }}>
                计划时间 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                style={repurchaseInputStyle}
                value={taskForm.planTime}
                onChange={(e) => setTaskForm((f) => ({ ...f, planTime: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className={styles.btnPrimary} onClick={createTask}>
                创建
              </button>
              <button type="button" className={styles.btnOutline} onClick={() => setCreatingTask(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
