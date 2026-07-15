"use client";

import { type ReactElement, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Inbox,
  Plus,
  Ticket as TicketIcon,
} from "lucide-react";
import { PageHeader } from "@qiyun/ui";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import styles from "@/styles/tickets.module.css";

type TicketStatus = "open" | "in_progress" | "resolved";
type TicketPriority = "low" | "normal" | "high";

interface Ticket {
  id: string;
  title: string;
  source: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  createdAt: string;
}

const PREVIEW_TICKETS: Ticket[] = [
  {
    id: "TK-1001",
    title: "华东制造 · 冷水机报价需求待确认参数",
    source: "官网 Widget",
    priority: "high",
    status: "open",
    assignee: "张工",
    createdAt: "10 分钟前",
  },
  {
    id: "TK-1002",
    title: "官网客服 · 交期与防腐方案未闭环",
    source: "会话转工单",
    priority: "normal",
    status: "in_progress",
    assignee: "李工",
    createdAt: "今天 09:20",
  },
  {
    id: "TK-1003",
    title: "小红书线索 · 选型咨询已解决",
    source: "小红书",
    priority: "low",
    status: "resolved",
    assignee: "王工",
    createdAt: "昨天 16:40",
  },
];

const STATUS_META: Record<TicketStatus, { label: string; cls: string; icon: ReactElement }> = {
  open: { label: "待处理", cls: "statusOpen", icon: <CircleDashed size={14} /> },
  in_progress: { label: "处理中", cls: "statusProgress", icon: <Clock size={14} /> },
  resolved: { label: "已解决", cls: "statusResolved", icon: <CheckCircle2 size={14} /> },
};

const PRIORITY_META: Record<TicketPriority, { label: string; cls: string }> = {
  low: { label: "低", cls: "priLow" },
  normal: { label: "中", cls: "priNormal" },
  high: { label: "高", cls: "priHigh" },
};

export function TicketsWorkspace() {
  const [tickets, setTickets] = useState<Ticket[]>(PREVIEW_TICKETS);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", source: "官网 Widget", priority: "normal" as TicketPriority });

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, t) => {
        acc[t.status] += 1;
        return acc;
      },
      { open: 0, in_progress: 0, resolved: 0 } as Record<TicketStatus, number>,
    );
  }, [tickets]);

  const advance = (ticket: Ticket) => {
    const next: Record<TicketStatus, TicketStatus> = {
      open: "in_progress",
      in_progress: "resolved",
      resolved: "open",
    };
    setTickets((current) => current.map((t) => (t.id === ticket.id ? { ...t, status: next[t.status] } : t)));
  };

  const createTicket = () => {
    if (!form.title.trim()) return;
    const id = `TK-${1004 + tickets.length}`;
    setTickets((current) => [
      {
        id,
        title: form.title.trim(),
        source: form.source,
        priority: form.priority,
        status: "open",
        assignee: "待分配",
        createdAt: "刚刚",
      },
      ...current,
    ]);
    setForm({ title: "", source: "官网 Widget", priority: "normal" });
    setCreating(false);
  };

  return (
    <div className={styles.page}>
      <ConsoleDataModeBanner />
      <PageHeader
        title="工单中心"
        description="将会话、留资线索中需要人工跟进的事项转为工单，跟踪处理状态与负责人。"
      />

      <div className={styles.summary}>
        {(["open", "in_progress", "resolved"] as TicketStatus[]).map((s) => (
          <div key={s} className={styles.summaryCard}>
            <div className={styles.summaryIcon}>{STATUS_META[s].icon}</div>
            <div>
              <div className={styles.summaryCount}>{counts[s]}</div>
              <div className={styles.summaryLabel}>{STATUS_META[s].label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <button type="button" className={styles.btnPrimary} onClick={() => setCreating((v) => !v)}>
          <Plus size={14} aria-hidden /> 新建工单
        </button>
      </div>

      {creating ? (
        <div className={styles.createCard}>
          <div className={styles.field}>
            <label>工单标题</label>
            <input
              className={styles.input}
              placeholder="例如：官网访客咨询 XX 产品参数"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label>来源</label>
              <select
                className={styles.input}
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                <option>官网 Widget</option>
                <option>会话转工单</option>
                <option>小红书</option>
                <option>抖音</option>
                <option>微信</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>优先级</label>
              <select
                className={styles.input}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
              >
                <option value="low">低</option>
                <option value="normal">中</option>
                <option value="high">高</option>
              </select>
            </div>
          </div>
          <div className={styles.createActions}>
            <button type="button" className={styles.btnPrimary} onClick={createTicket}>
              创建
            </button>
            <button type="button" className={styles.btnOutline} onClick={() => setCreating(false)}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.list}>
        {tickets.length === 0 ? (
          <div className={styles.empty}>
            <Inbox size={32} color="#94a3b8" />
            <p>暂无工单。点击「新建工单」将会话或线索转交人工跟进。</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <article key={ticket.id} className={styles.ticketCard}>
              <div className={styles.ticketMain}>
                <div className={styles.ticketTitleRow}>
                  <TicketIcon size={16} color="#2563eb" />
                  <span className={styles.ticketTitle}>{ticket.title}</span>
                  <span className={`${styles.badge} ${styles[PRIORITY_META[ticket.priority].cls]}`}>
                    {PRIORITY_META[ticket.priority].label}优先级
                  </span>
                </div>
                <div className={styles.ticketMeta}>
                  <span>{ticket.id}</span>
                  <span>来源：{ticket.source}</span>
                  <span>负责人：{ticket.assignee}</span>
                  <span>{ticket.createdAt}</span>
                </div>
              </div>
              <div className={styles.ticketSide}>
                <span className={`${styles.badge} ${styles[STATUS_META[ticket.status].cls]}`}>
                  {STATUS_META[ticket.status].icon} {STATUS_META[ticket.status].label}
                </span>
                <button type="button" className={styles.btnOutline} onClick={() => advance(ticket)}>
                  推进状态
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
