"use client";

import Link from "next/link";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Edit,
  FileText,
  Flag,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  createFollowTask,
  followTaskAction,
  listFollowTasks,
  patchFollowTask,
  type FollowTaskEvent,
} from "@/lib/follow-tasks/api";
import { listCustomerOpportunities, listInquiries } from "@/lib/sales/api";
import type { CustomerOpportunityItem, InquiryListItem } from "@/lib/sales/types";
import { loadWorkspaceMembers, type WorkspaceMemberSummary } from "@/lib/auth/members";
import { FollowTaskDetailDrawer } from "@/components/sales/follow-task-detail-drawer";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/follow-up-tasks.module.css";

const PAGE_SIZE = 10;

type TaskTab = "all" | "mine" | "created" | "joined";
type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
type TaskPriority = "high" | "medium" | "low";

interface FollowUpTask {
  id: string;
  title: string;
  customerName: string;
  taskType: string;
  priority: TaskPriority;
  ownerName: string;
  ownerColor: string;
  dueAt: string;
  status: TaskStatus;
  kanbanStatus: TaskStatus;
  createdBy?: string;
  assigneeId?: string;
  inquiryId?: string;
}

const DEMO_TASKS: FollowUpTask[] = [];

const TASK_TYPE_META = [
  { label: "客户跟进", color: "#3b82f6" },
  { label: "资料发送", color: "#22c55e" },
  { label: "订单确认", color: "#eab308" },
  { label: "合同跟进", color: "#a855f7" },
  { label: "客户拜访", color: "#f97316" },
  { label: "其他", color: "#9ca3af" },
];

const OWNER_NAMES = ["张经理", "李明哲", "王晓蓉"];
const OWNER_COLORS = ["#2563eb", "#16a34a", "#9333ea"];
const TASK_TYPES = ["客户跟进", "资料发送", "订单确认", "客户拜访", "收款跟进"];

const taskInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#fff",
};

const taskCancelBtnStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#fff",
  color: "#475569",
  fontSize: 14,
  cursor: "pointer",
};

const taskCreateBtnStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #2563eb",
  borderRadius: 6,
  background: "#2563eb",
  color: "#fff",
  fontSize: 14,
  cursor: "pointer",
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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

function resolveStatus(dueAt: string | null): TaskStatus {
  if (!dueAt) return "pending";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "pending";
  const now = Date.now();
  if (due.getTime() < now - 86400000) return "overdue";
  if (due.getTime() < now) return "in_progress";
  return "pending";
}

function mapFollowTaskEvent(event: FollowTaskEvent): FollowUpTask {
  const hash = hashString(event.id);
  const dueAt = formatDateTime(event.start);
  const status =
    event.status === "done"
      ? "completed"
      : event.status === "cancelled"
        ? "completed"
        : resolveStatus(event.start);
  return {
    id: event.id,
    title: event.title,
    customerName: event.leadName ?? "—",
    taskType: "客户跟进",
    priority: event.note?.includes("高") ? "high" : "medium",
    ownerName: event.ownerName ?? OWNER_NAMES[hash % OWNER_NAMES.length],
    ownerColor: OWNER_COLORS[hash % OWNER_COLORS.length],
    dueAt,
    status,
    kanbanStatus: status,
    inquiryId: event.leadId,
  };
}

function buildFromApi(customers: CustomerOpportunityItem[], inquiries: InquiryListItem[]): FollowUpTask[] {
  const apiTasks: FollowUpTask[] = [];

  for (const item of customers) {
    if (!item.nextFollowUpAt) continue;
    const hash = hashString(item.id);
    const status = resolveStatus(item.nextFollowUpAt);
    apiTasks.push({
      id: `c-${item.id}`,
      title: `跟进 ${item.customerName}`,
      customerName: item.customerName,
      taskType: "客户跟进",
      priority: item.lifecycleColumn === "won_or_repeat" ? "high" : "medium",
      ownerName: "未分配",
      ownerColor: "#9ca3af",
      dueAt: formatDateTime(item.nextFollowUpAt),
      status,
      kanbanStatus: status,
    });
  }

  for (const inquiry of inquiries.slice(0, 5)) {
    if (!inquiry.nextActionAt) continue;
    const hash = hashString(inquiry.id);
    const status = resolveStatus(inquiry.nextActionAt);
    apiTasks.push({
      id: `i-${inquiry.id}`,
      title: inquiry.summary?.slice(0, 24) ?? `询盘跟进 · ${inquiry.customerName}`,
      customerName: inquiry.customerName,
      taskType: inquiry.intentLevel === "high" ? "客户跟进" : "资料发送",
      priority: inquiry.intentLevel === "high" ? "high" : "medium",
      ownerName: "未分配",
      ownerColor: "#9ca3af",
      dueAt: formatDateTime(inquiry.nextActionAt),
      status,
      kanbanStatus: status,
    });
  }

  return apiTasks;
}

function priorityClass(priority: TaskPriority): string {
  if (priority === "high") return styles.priorityHigh;
  if (priority === "medium") return styles.priorityMedium;
  return styles.priorityLow;
}

function statusClass(status: TaskStatus): string {
  if (status === "pending") return styles.statusPending;
  if (status === "in_progress") return styles.statusProgress;
  if (status === "completed") return styles.statusDone;
  return styles.statusOverdue;
}

function statusLabel(status: TaskStatus): string {
  if (status === "pending") return "待跟进";
  if (status === "in_progress") return "进行中";
  if (status === "completed") return "已完成";
  return "逾期";
}

function kanbanBorder(status: TaskStatus): string {
  if (status === "in_progress") return styles.kanbanCardBlue;
  if (status === "completed") return styles.kanbanCardGreen;
  if (status === "overdue") return styles.kanbanCardRed;
  return "";
}

function TaskTypeDonut({ stats }: { stats: Array<{ label: string; color: string; count: number }> }) {
  const segments = stats.map((s) => s.count);
  const total = segments.reduce((a, b) => a + b, 0);
  const r = 52;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden>
      {stats.map((stat, index) => {
        const pct = total > 0 ? stat.count / total : 0;
        const dash = pct * circumference;
        const rotation = (offset / circumference) * 360 - 90;
        offset += dash;
        return (
          <circle
            key={stat.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={stat.color}
            strokeWidth={18}
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(${rotation} ${cx} ${cy})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={38} fill="#fff" />
    </svg>
  );
}

function MiniCalendar() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startPad = new Date(cursor.year, cursor.month, 1).getDay();
  const days: Array<{ label: string; muted: boolean; active: boolean; day?: number }> = [];
  for (let i = 0; i < startPad; i += 1) {
    days.push({ label: "", muted: true, active: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      label: String(day),
      muted: false,
      active: day === selectedDay,
      day,
    });
  }

  return (
    <div className={styles.cardPadded}>
      <div className={styles.cardTitleRow}>
        <h3 className={styles.cardTitle}>日历视图</h3>
        <div className={styles.calendarNav}>
          <button
            type="button"
            aria-label="上一月"
            onClick={() =>
              setCursor((prev) => {
                const d = new Date(prev.year, prev.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {cursor.year}年{cursor.month + 1}月
          </span>
          <button
            type="button"
            aria-label="下一月"
            onClick={() =>
              setCursor((prev) => {
                const d = new Date(prev.year, prev.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className={styles.calendarGrid}>
        {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
          <div key={d} className={styles.calendarWeekday}>
            {d}
          </div>
        ))}
        {days.map((day, index) => (
          <button
            key={`${day.label}-${index}`}
            type="button"
            disabled={day.muted || !day.day}
            className={`${styles.calendarDay} ${day.muted ? styles.calendarDayMuted : ""} ${day.active ? styles.calendarDayActive : ""}`}
            onClick={() => {
              if (day.day) setSelectedDay(day.day);
            }}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FollowUpTasksWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [activeTab, setActiveTab] = useState<TaskTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!creating) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreating(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating]);

  const [saving, setSaving] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<FollowUpTask[]>([]);
  const [form, setForm] = useState({ title: "", customerName: "", dueDate: "", priority: "medium" as TaskPriority });

  const displayTasks = useMemo(() => [...createdTasks, ...tasks], [createdTasks, tasks]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let preview = true;
    try {
      const mode = await fetchConsoleMode();
      preview = isPreviewMode(mode);
      setIsPreview(preview);
    } catch {
      setIsPreview(true);
      preview = true;
    }

    try {
      if (!preview) {
        const events = await listFollowTasks();
        const mapped = events.map(mapFollowTaskEvent);
        setTasks(mapped);
        setSelectedId((prev) => (prev && mapped.some((t) => t.id === prev) ? prev : mapped[0]?.id ?? null));
        return;
      }

      const results = await Promise.allSettled([listCustomerOpportunities(), listInquiries({ limit: 50 })]);
      const failed = results.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") setError(failed.reason);
      if (results[0]?.status === "fulfilled" && results[1]?.status === "fulfilled") {
        const merged = buildFromApi(results[0].value, results[1].value);
        setTasks(merged);
        setSelectedId((prev) => (prev && merged.some((t) => t.id === prev) ? prev : merged[0]?.id ?? null));
      }
    } catch (reason) {
      setError(reason);
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

  useEffect(() => {
    if (isPreview) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    loadWorkspaceMembers()
      .then((next) => {
        if (!cancelled) setMembers(next);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isPreview]);

  const openDetail = (taskId: string) => {
    setSelectedId(taskId);
    setDetailTaskId(taskId);
  };

  const updateLocalTask = (taskId: string, patch: Partial<FollowUpTask>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
    setCreatedTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  };

  const handleAssign = async (taskId: string, ownerId: string, ownerName: string) => {
    if (isPreview) {
      updateLocalTask(taskId, { ownerName });
      return;
    }
    try {
      await patchFollowTask(taskId, { assigneeUserId: ownerId });
      await load();
    } catch (reason) {
      setError(reason);
    }
  };

  const handlePatchPriority = async (taskId: string, priority: "high" | "medium" | "low") => {
    if (isPreview) {
      updateLocalTask(taskId, { priority });
      return;
    }
    try {
      await patchFollowTask(taskId, { priority });
      await load();
    } catch (reason) {
      setError(reason);
    }
  };

  const handleDelay = async (taskId: string, dueAt: string, reason: string) => {
    if (isPreview) {
      updateLocalTask(taskId, { dueAt: formatDateTime(dueAt), status: "pending", kanbanStatus: "pending" });
      return;
    }
    try {
      await followTaskAction(taskId, "delay", { dueAt, note: reason });
      await load();
    } catch (reason) {
      setError(reason);
    }
  };

  const handleComplete = async (taskId: string, result: string) => {
    if (isPreview) {
      updateLocalTask(taskId, { status: "completed", kanbanStatus: "completed" });
      return;
    }
    try {
      await followTaskAction(taskId, "complete", { note: result });
      await load();
    } catch (reason) {
      setError(reason);
    }
  };

  const handleCancel = async (taskId: string, reason: string) => {
    if (isPreview) {
      updateLocalTask(taskId, { status: "completed", kanbanStatus: "completed" });
      return;
    }
    try {
      await followTaskAction(taskId, "cancel", { note: reason });
      await load();
    } catch (reason) {
      setError(reason);
    }
  };

  const createTask = () => {
    if (saving) return;
    if (!form.title.trim() || !form.customerName.trim() || !form.dueDate) return;
    if (isPreview) {
      setError(new Error("预览模式下无法创建跟进任务，请配置 API_BASE_URL。"));
      return;
    }

    setSaving(true);
    setError(null);
    void createFollowTask({
      title: form.title.trim(),
      dueAt: new Date(`${form.dueDate}T09:00:00`).toISOString(),
      customerName: form.customerName.trim(),
      note: `优先级：${form.priority === "high" ? "高" : form.priority === "medium" ? "中" : "低"}`,
    })
      .then(async () => {
        setForm({ title: "", customerName: "", dueDate: "", priority: "medium" });
        setCreating(false);
        await load();
      })
      .catch((reason) => setError(reason))
      .finally(() => {
        setSaving(false);
      });
  };

  const completeTask = (taskId: string) => {
    if (isPreview) {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status: "completed", kanbanStatus: "completed" } : task,
        ),
      );
      setCreatedTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status: "completed", kanbanStatus: "completed" } : task,
        ),
      );
      return;
    }
    void followTaskAction(taskId, "complete")
      .then(() => load())
      .catch((reason) => setError(reason));
  };

  const kpis = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return {
      total: displayTasks.length,
      today: displayTasks.filter((t) => t.dueAt.startsWith(todayStr) && t.status !== "completed").length,
      overdue: displayTasks.filter((t) => t.status === "overdue").length,
      completedMonth: displayTasks.filter((t) => t.status === "completed").length,
      highPriority: displayTasks.filter((t) => t.priority === "high").length,
    };
  }, [displayTasks]);

  const typeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of displayTasks) counts[t.taskType] = (counts[t.taskType] ?? 0) + 1;
    const total = displayTasks.length;
    return TASK_TYPE_META.map((m) => ({
      label: m.label,
      color: m.color,
      count: counts[m.label] ?? 0,
      percent: total > 0 ? `${Math.round(((counts[m.label] ?? 0) / total) * 100)}%` : "0%",
    }));
  }, [displayTasks]);

  const upcomingItems = useMemo(
    () =>
      displayTasks
        .filter((t) => t.status === "pending" || t.status === "in_progress")
        .slice()
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .slice(0, 3)
        .map((t) => ({
          title: t.title,
          customer: t.customerName,
          priority: t.priority,
          when: "待处理",
          whenClass: t.priority === "high" ? "#dc2626" : "#2563eb",
        })),
    [displayTasks],
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayTasks.filter((task) => {
      if (activeTab === "mine" && task.ownerName !== "张经理") return false;
      if (activeTab === "created" && task.ownerName === "张经理") return false;
      if (activeTab === "joined" && task.priority === "low") return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (ownerFilter !== "all" && task.ownerName !== ownerFilter) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.customerName.toLowerCase().includes(q) ||
        task.ownerName.toLowerCase().includes(q)
      );
    });
  }, [activeTab, search, statusFilter, priorityFilter, ownerFilter, displayTasks]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const pageTasks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, page]);

  const kanbanColumns = useMemo(
    () =>
      [
        { id: "pending" as const, title: "待跟进", border: "" },
        { id: "in_progress" as const, title: "进行中", border: styles.kanbanCardBlue },
        { id: "completed" as const, title: "已完成", border: styles.kanbanCardGreen },
        { id: "overdue" as const, title: "逾期", border: styles.kanbanCardRed },
      ].map((col) => ({
        ...col,
        items: displayTasks.filter((t) => t.kanbanStatus === col.id).slice(0, 4),
        count: displayTasks.filter((t) => t.kanbanStatus === col.id).length,
      })),
    [displayTasks],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, statusFilter, priorityFilter, ownerFilter]);

  if (loading) {
    return (
      <ConsolePage>
        <div className={styles.page}>
          <p className={styles.loadingText}>正在加载跟进任务…</p>
          <Skeleton className="h-64 w-full" />
        </div>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="跟进任务" />
        {actionNotice ? (
          <p className="text-sm text-success" role="status">
            {actionNotice}
          </p>
        ) : null}
        {isPreview ? (
          <ConsoleReadOnlyNotice
            title="预览数据"
            description="任务列表由询盘与客户机会聚合生成；本地新建任务仅保存在当前会话，不会写入后端。"
          />
        ) : null}
        {error ? (
          <ConsoleRequestError
            {...resolveRequestErrorPresentation(error, "部分任务数据加载失败，请稍后重试。")}
          />
        ) : null}
      </ConsolePageAlerts>
      <div className={styles.page}>

      <div className={styles.pageHeaderRow}>
        <div className={styles.headerActions}>
          <label className={styles.headerSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="搜索任务、客户、联系人..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="pending">待跟进</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="overdue">逾期</option>
          </select>
          <select
            className={styles.filterSelect}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">全部优先级</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select className={styles.filterSelect} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="all">全部负责人</option>
            {OWNER_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/calendar"
            className={styles.actionBtn}
            aria-label="日历"
            title="打开跟进日历"
          >
            <Calendar size={18} />
          </Link>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiIconBlue}`}>
                <ClipboardList size={18} aria-hidden />
              </div>
              <div>
                <div className={styles.kpiLabel}>全部任务</div>
                <div className={styles.kpiValue}>{kpis.total}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiIconOrange}`}>
                <Calendar size={18} aria-hidden />
              </div>
              <div>
                <div className={styles.kpiLabel}>今日待跟进</div>
                <div className={styles.kpiValue}>{kpis.today}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiIconRed}`}>
                <AlertCircle size={18} aria-hidden />
              </div>
              <div>
                <div className={styles.kpiLabel}>逾期任务</div>
                <div className={styles.kpiValue}>{kpis.overdue}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
                <CheckCircle2 size={18} aria-hidden />
              </div>
              <div>
                <div className={styles.kpiLabel}>已完成（本月）</div>
                <div className={styles.kpiValue}>{kpis.completedMonth}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={`${styles.kpiIcon} ${styles.kpiIconPurple}`}>
                <Flag size={18} aria-hidden />
              </div>
              <div>
                <div className={styles.kpiLabel}>高优先级</div>
                <div className={styles.kpiValue}>{kpis.highPriority}</div>
              </div>
            </div>
          </div>

          <div className={styles.tabRow}>
            {(
              [
                ["all", "全部任务"],
                ["mine", "我负责的"],
                ["created", "我创建的"],
                ["joined", "我参与的"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={activeTab === id ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" aria-label="全选" />
                    </th>
                    <th>任务标题</th>
                    <th>关联客户</th>
                    <th>任务类型</th>
                    <th>优先级</th>
                    <th>负责人</th>
                    <th>任务日期</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={selectedId === task.id ? styles.rowSelected : undefined}
                      onClick={() => openDetail(task.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`选择 ${task.title}`} />
                      </td>
                      <td className={styles.cellTitle}>{task.title}</td>
                      <td className={styles.cellMuted}>{task.customerName}</td>
                      <td className={styles.cellMuted}>{task.taskType}</td>
                      <td>
                        <span className={priorityClass(task.priority)}>
                          {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.ownerCell}>
                          <div className={styles.avatar} style={{ background: task.ownerColor }}>
                            {task.ownerName.charAt(0)}
                          </div>
                          <span className={styles.cellMuted}>{task.ownerName}</span>
                        </div>
                      </td>
                      <td className={styles.cellMuted}>{task.dueAt}</td>
                      <td>
                        <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {task.status !== "completed" ? (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            aria-label="标记完成"
                            title="标记完成"
                            onClick={() => completeTask(task.id)}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        ) : null}
                        <button type="button" className={styles.actionBtn} aria-label="编辑" onClick={() => openDetail(task.id)}>
                          <Edit size={14} />
                        </button>
                        <button type="button" className={styles.actionBtn} aria-label="更多">
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pageTasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>
                        暂无任务
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>共 {filteredTasks.length} 条</span>
              <div className={styles.paginationRight}>
                <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((num) => (
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
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
                <span>{PAGE_SIZE}条/页</span>
              </div>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>任务看板</h2>
          <div className={styles.kanbanGrid}>
            {kanbanColumns.map((col) => (
              <div key={col.id} className={styles.kanbanCol}>
                <div className={styles.kanbanHead}>
                  <h3>{col.title}</h3>
                  <span className={styles.kanbanCount}>({col.count})</span>
                </div>
                {col.items.map((task) => (
                  <div key={task.id} className={`${styles.kanbanCard} ${col.border || kanbanBorder(task.kanbanStatus)}`}>
                    <div className={styles.kanbanCardTitle}>{task.title}</div>
                    <div className={styles.kanbanCardCustomer}>{task.customerName}</div>
                    <div className={styles.kanbanCardMeta}>
                      <span>
                        <Clock size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden />
                        {task.dueAt.slice(5, 16)}
                      </span>
                      <span className={priorityClass(task.priority)}>
                        {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                      </span>
                    </div>
                    <div className={styles.ownerCell} style={{ marginTop: 8 }}>
                      <div className={styles.avatar} style={{ background: task.ownerColor, width: 20, height: 20, fontSize: 9 }}>
                        {task.ownerName.charAt(0)}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className={styles.addTaskBtn} onClick={() => setCreating(true)}>
                  <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} aria-hidden />
                  添加任务
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sidebarCol}>
          <MiniCalendar />

          <div className={styles.cardPadded}>
            <h3 className={styles.cardTitle}>任务类型分布</h3>
            <div className={styles.donutWrap}>
              <TaskTypeDonut stats={typeStats} />
            </div>
            <div className={styles.typeList}>
              {typeStats.map((stat) => (
                <div key={stat.label} className={styles.typeRow}>
                  <div className={styles.typeLabel}>
                    <span className={styles.typeDot} style={{ background: stat.color }} />
                    {stat.label}
                  </div>
                  <span>
                    {stat.count} ({stat.percent})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.cardPadded}>
            <h3 className={styles.cardTitle}>快捷操作</h3>
            <div className={styles.quickGrid}>
              {[
                { icon: Plus, label: "新建任务", color: "#2563eb" },
                { icon: Upload, label: "批量导入", color: "#16a34a", comingSoon: true },
                { icon: FileText, label: "任务模板", color: "#ea580c", comingSoon: true },
                { icon: Download, label: "导出任务", color: "#9333ea" },
              ].map(({ icon: Icon, label, color, comingSoon }) => (
                <button
                  key={label}
                  type="button"
                  className={styles.quickBtn}
                  disabled={comingSoon}
                  title={comingSoon ? `${label}即将上线` : undefined}
                  onClick={() => {
                    if (comingSoon) return;
                    if (label === "新建任务") {
                      setCreating(true);
                      return;
                    }
                    if (label === "导出任务") {
                      setActionNotice(`已导出 ${displayTasks.length} 条任务记录（本地）。`);
                    }
                  }}
                >
                  <Icon size={18} color={color} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.cardPadded}>
            <h3 className={styles.cardTitle}>即将到期任务</h3>
            {upcomingItems.length === 0 ? (
              <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>暂无即将到期任务</div>
            ) : (
              upcomingItems.map((item) => (
                <div key={item.title} className={styles.upcomingItem}>
                  <div className={styles.upcomingDot} style={{ background: item.whenClass }} />
                  <div className={styles.upcomingBody}>
                    <div className={styles.upcomingWhen} style={{ color: item.whenClass }}>
                      {item.when}
                      <span className={priorityClass(item.priority)} style={{ float: "right" }}>
                        {item.priority === "high" ? "高" : "中"}
                      </span>
                    </div>
                    <div className={styles.upcomingTitle}>{item.title}</div>
                    <div className={styles.upcomingCustomer}>{item.customer}</div>
                  </div>
                </div>
              ))
            )}
            <button type="button" className={styles.viewMore} disabled title="即将上线">
              查看更多
            </button>
          </div>
        </div>

        {creating ? (
          <div
            role="presentation"
            data-testid="task-create-backdrop"
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
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>新建任务</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 13, color: "#475569" }}>任务标题</label>
                  <input
                    style={taskInputStyle}
                    placeholder="例如：跟进华东制造冷水机报价"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 13, color: "#475569" }}>关联客户</label>
                  <input
                    style={taskInputStyle}
                    placeholder="例如：华东制造"
                    value={form.customerName}
                    onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 13, color: "#475569" }}>截止日期</label>
                  <input
                    style={taskInputStyle}
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 13, color: "#475569" }}>优先级</label>
                  <select
                    style={taskInputStyle}
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", margin: "12px 0 0" }}>
                {isPreview
                  ? "预览模式：无法写入跟进任务，请配置 API_BASE_URL 后重试。"
                  : "任务将保存到跟进日历，可在询盘详情中查看记录。"}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  style={taskCancelBtnStyle}
                  onClick={() => setCreating(false)}
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  type="button"
                  style={taskCreateBtnStyle}
                  onClick={createTask}
                  disabled={saving}
                >
                  {saving ? "创建中…" : "创建"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {detailTaskId ? (
          <FollowTaskDetailDrawer
            taskId={detailTaskId}
            isPreview={isPreview}
            initialTask={displayTasks.find((task) => task.id === detailTaskId)}
            members={members}
            previewOwners={OWNER_NAMES}
            onClose={() => setDetailTaskId(null)}
            onAssign={(ownerId, ownerName) => handleAssign(detailTaskId, ownerId, ownerName)}
            onPatchPriority={(priority) => handlePatchPriority(detailTaskId, priority)}
            onDelay={(dueAt, reason) => handleDelay(detailTaskId, dueAt, reason)}
            onComplete={(result) => handleComplete(detailTaskId, result)}
            onCancel={(reason) => handleCancel(detailTaskId, reason)}
          />
        ) : null}
      </div>
      </div>
    </ConsolePage>
  );
}
