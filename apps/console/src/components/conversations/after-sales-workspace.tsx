"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Box,
  CalendarCheck,
  Check,
  Clock,
  Download,
  FileText,
  Headphones,
  ImageIcon,
  MessageSquare,
  Package,
  Pause,
  Route,
  Search,
  Share2,
  Smile,
  StickyNote,
  TriangleAlert,
  Upload,
  User,
  Zap,
  ArrowUp,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner, ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  applyConversationFilters,
  getConversationDetail,
  listConversationsPage,
  updateConversationStatus,
} from "@/lib/conversations/data";
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationMessage,
  ConversationStatus,
} from "@/lib/conversations/types";
import styles from "@/styles/after-sales.module.css";

const PAGE_SIZE = 50;

type ViewMode = "list" | "detail";

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${sec}`;
}

function formatShort(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ticketNo(id: string, createdAt: string): string {
  const d = new Date(createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = id.replace(/\D/g, "").slice(-3).padStart(3, "0");
  return `#AS${y}${m}${day}${suffix}`;
}

function statusDisplay(status: ConversationStatus): { label: string; tagClass: string; priority?: string } {
  if (status === "resolved") return { label: "已完成", tagClass: styles.tagGray };
  if (status === "pending") return { label: "待客户确认", tagClass: styles.tagYellow };
  if (status === "unresolved") return { label: "处理中", tagClass: styles.tagGreen, priority: "高" };
  return { label: "处理中", tagClass: styles.tagGreen };
}

function workflowStage(status: ConversationStatus): number {
  if (status === "resolved") return 4;
  if (status === "pending") return 3;
  if (status === "unresolved" || status === "open") return 2;
  return 2;
}

function initials(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  desc: string;
};

function buildTimeline(detail: ConversationDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "created",
      time: formatDateTime(detail.createdAt),
      title: "客户提交工单",
      desc: `客户通过${detail.channel}提交了咨询`,
    },
  ];

  const systemMsg = detail.messages.find((m) => m.role === "system");
  if (systemMsg) {
    events.push({
      id: systemMsg.id,
      time: formatDateTime(systemMsg.createdAt),
      title: "系统自动回复",
      desc: "系统自动发送了确认消息",
    });
  }

  if (detail.assignee) {
    events.push({
      id: "assign",
      time: formatDateTime(detail.updatedAt),
      title: "工单分配",
      desc: `工单已分配给 ${detail.assignee}`,
    });
  }

  const staffReply = [...detail.messages].reverse().find((m) => m.role === "assistant");
  if (staffReply) {
    events.push({
      id: staffReply.id,
      time: formatDateTime(staffReply.createdAt),
      title: "工程师回复",
      desc: `${detail.assignee ?? detail.botName} 回复了客户咨询`,
    });
  }

  return events;
}

const DEFAULT_ATTACHMENTS = [
  { name: "产品更换指南.pdf", meta: "2.4 MB · 2024-03-15", type: "pdf" as const },
  { name: "安装操作视频.mp4", meta: "15.7 MB · 2024-03-15", type: "video" as const },
];

export function AfterSalesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightFromUrl = searchParams.get("highlight");
  const handledHighlightRef = useRef<string | null>(null);

  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredItems = useMemo(
    () =>
      applyConversationFilters(items, {
        query: search,
        botId: "all",
        hasLead: null,
        unresolvedOnly: false,
      }),
    [items, search],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const page = await listConversationsPage({ limit: PAGE_SIZE });
      setItems(page.items);
    } catch (error) {
      setListError(getApiErrorMessage(error, "加载工单列表失败。"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getConversationDetail(id);
      setDetail(data);
    } catch (error) {
      setDetail(null);
      setDetailError(getApiErrorMessage(error, "加载工单详情失败。"));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!highlightFromUrl || loading) return;
    if (handledHighlightRef.current === highlightFromUrl) return;
    handledHighlightRef.current = highlightFromUrl;
    setSelectedId(highlightFromUrl);
    setView("detail");
  }, [highlightFromUrl, loading]);

  useEffect(() => {
    if (view === "detail" && selectedId) {
      void loadDetail(selectedId);
    }
  }, [view, selectedId, loadDetail]);

  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
    setActionMessage(null);
  }

  function backToList() {
    setView("list");
    setDetail(null);
    setReplyDraft("");
  }

  async function handleCompleteTicket() {
    if (!detail) return;
    try {
      const updated = await updateConversationStatus(detail.id, "resolved");
      setDetail(updated);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
      setActionMessage("工单已标记为完成。");
    } catch (error) {
      setActionMessage(getApiErrorMessage(error, "状态更新失败。"));
    }
  }

  function renderMessage(message: ConversationMessage, detail: ConversationDetail) {
    const customerName = detail.lead?.company ?? detail.lead?.name ?? detail.visitorLabel;
    const staffName = detail.assignee ?? detail.botName;

    if (message.role === "user") {
      return (
        <div key={message.id} className={styles.chatRow}>
          <div className={styles.chatAvatar} style={{ background: "#2563eb" }}>
            {initials(customerName)}
          </div>
          <div className={`${styles.chatBubble} ${styles.chatCustomer}`}>{message.content}</div>
          <span className={styles.chatTime}>{formatShort(message.createdAt)}</span>
        </div>
      );
    }

    if (message.role === "system") {
      return (
        <div key={message.id} className={styles.chatRow}>
          <div className={styles.chatAvatar} style={{ background: "#cbd5e1", color: "#475569" }}>
            <Headphones size={14} aria-hidden />
          </div>
          <div className={`${styles.chatBubble} ${styles.chatSystem}`}>{message.content}</div>
          <span className={styles.chatTime}>{formatShort(message.createdAt)}</span>
        </div>
      );
    }

    return (
      <div key={message.id} className={`${styles.chatRow} ${styles.chatRowStaff}`}>
        <div className={styles.chatAvatar} style={{ background: "#16a34a" }}>
          {initials(staffName)}
        </div>
        <div className={`${styles.chatBubble} ${styles.chatStaff}`}>{message.content}</div>
        <span className={styles.chatTime}>{formatShort(message.createdAt)}</span>
      </div>
    );
  }

  if (loading && view === "list") {
    return (
      <div className={styles.page}>
        <Skeleton style={{ height: 28, width: 160, marginBottom: 16 }} />
        <Skeleton className={styles.card} style={{ height: 400 }} />
      </div>
    );
  }

  if (listError && view === "list" && !items.length) {
    return (
      <div className={styles.page}>
        <ConsoleRequestError message={listError} onRetry={() => void loadList()} />
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p>管理客户售后工单，跟踪处理进度与沟通记录</p>
        </header>

        <ConsoleDataModeBanner feature="会话" />

        <article className={styles.card}>
          <div className={styles.listToolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} aria-hidden />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="搜索客户、联系人、工单、产品..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <ConsoleModeBadge />
          </div>

          {filteredItems.length ? (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>工单号</th>
                  <th>客户</th>
                  <th>咨询摘要</th>
                  <th>状态</th>
                  <th>负责人</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = statusDisplay(item.status);
                  return (
                    <tr
                      key={item.id}
                      className={selectedId === item.id ? styles.rowActive : undefined}
                      onClick={() => openDetail(item.id)}
                    >
                      <td>{ticketNo(item.id, item.createdAt)}</td>
                      <td>{item.visitorLabel}</td>
                      <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.summary}
                      </td>
                      <td>
                        <span className={`${styles.tag} ${status.tagClass}`}>{status.label}</span>
                      </td>
                      <td>{item.botName}</td>
                      <td style={{ color: "#64748b" }}>{formatShort(item.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyHint}>暂无工单，客户提交咨询后将显示在此列表。</div>
          )}
        </article>
      </div>
    );
  }

  const listItem = items.find((item) => item.id === selectedId);
  const status = detail ? statusDisplay(detail.status) : listItem ? statusDisplay(listItem.status) : null;
  const stage = detail ? workflowStage(detail.status) : 2;
  const timeline = detail ? buildTimeline(detail) : [];
  const customerName = detail?.lead?.company ?? detail?.lead?.name ?? detail?.visitorLabel ?? "—";
  const contactName = detail?.lead?.name ?? detail?.visitorLabel ?? "—";
  const phone = detail?.lead?.phone ?? "—";
  const email = detail?.lead?.email ?? "—";

  return (
    <div className={styles.page}>
      <button type="button" className={styles.btnOutline} onClick={backToList} style={{ padding: "4px 8px", marginBottom: 12 }}>
        <ArrowLeft size={14} aria-hidden />
        返回售后咨询
      </button>

      <ConsoleDataModeBanner feature="会话" />
      {actionMessage ? (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#16a34a" }}>{actionMessage}</p>
      ) : null}

      {detailLoading || !detail ? (
        <Skeleton className={styles.ticketHeader} style={{ height: 72, marginBottom: 16 }} />
      ) : (
        <div className={styles.ticketHeader}>
          <div className={styles.ticketTitleRow}>
            <span className={styles.ticketTitle}>工单详情</span>
            {status ? (
              <span className={`${styles.tag} ${status.tagClass}`}>{status.label}</span>
            ) : null}
            <span className={styles.ticketMeta}>{ticketNo(detail.id, detail.createdAt)}</span>
            <span className={styles.ticketMeta}>
              <Clock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} aria-hidden />
              创建时间：{formatDateTime(detail.createdAt)}
            </span>
            <span className={styles.ticketMeta}>来源：{detail.channel}</span>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.btnOutline} onClick={backToList}>
              <ArrowLeft size={14} aria-hidden />
              返回列表
            </button>
            <button type="button" className={styles.btnOutline} disabled title="即将上线">
              <Share2 size={14} aria-hidden />
              转交工单
            </button>
            <button type="button" className={styles.btnOutline} disabled title="即将上线">
              <Pause size={14} aria-hidden />
              挂起工单
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => void handleCompleteTicket()}>
              <Check size={14} aria-hidden />
              完成工单
            </button>
          </div>
        </div>
      )}

      {detailError ? (
        <ConsoleRequestError
          message={detailError}
          onRetry={selectedId ? () => void loadDetail(selectedId) : undefined}
        />
      ) : null}

      {detail ? (
        <>
          <div className={styles.infoGrid}>
            <article className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                <User size={16} color="#2563eb" aria-hidden />
                客户信息
              </h3>
              <div className={styles.customerRow}>
                <div className={styles.customerAvatar}>{initials(customerName)}</div>
                <div>
                  <div style={{ fontWeight: 500 }}>{customerName}</div>
                  {detail.lead ? (
                    <span className={`${styles.tag} ${styles.tagGreen}`}>老客户</span>
                  ) : (
                    <span className={`${styles.tag} ${styles.tagBlue}`}>新客户</span>
                  )}
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>联系人：</span>
                <span className={styles.infoValue}>{contactName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>联系电话：</span>
                <span className={styles.infoValue}>{phone}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>邮箱：</span>
                <span className={styles.infoValue}>{email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>客户等级：</span>
                <span className={styles.infoValue}>{detail.highIntent ? "A级客户" : "B级客户"}</span>
              </div>
            </article>

            <article className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                <Package size={16} color="#2563eb" aria-hidden />
                产品信息
              </h3>
              <div className={styles.productRow}>
                <div className={styles.productThumb}>
                  <Box size={24} aria-hidden />
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{detail.aiInsight?.productLine ?? detail.botName}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{detail.summary.slice(0, 40)}</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>关联助手：</span>
                <span className={styles.infoValue}>{detail.botName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>来源页面：</span>
                <span className={styles.infoValue} style={{ wordBreak: "break-all" }}>
                  {detail.pageUrl || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>质保状态：</span>
                <span className={`${styles.tag} ${styles.tagGreen}`}>质保期内</span>
              </div>
            </article>

            <article className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                <FileText size={16} color="#2563eb" aria-hidden />
                工单信息
              </h3>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>咨询类型：</span>
                <span className={styles.infoValue}>{detail.aiIntentLabel ?? "产品使用问题"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>优先级：</span>
                <span className={`${styles.tag} ${status?.priority ? styles.tagRed : styles.tagGray}`}>
                  {status?.priority ?? "中"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>处理团队：</span>
                <span className={styles.infoValue}>售后技术部</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>负责人：</span>
                <span className={styles.infoValue}>
                  <span className={styles.assigneeRow}>
                    <span className={styles.assigneeAvatar}>
                      {initials(detail.assignee ?? detail.botName)}
                    </span>
                    {detail.assignee ?? detail.botName}
                  </span>
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>期望回复：</span>
                <span className={styles.infoValue}>{formatShort(detail.updatedAt)}</span>
              </div>
            </article>

            <article className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>
                <Route size={16} color="#2563eb" aria-hidden />
                工单流程
              </h3>
              <div className={styles.stageTrack}>
                <div className={styles.stageLine} />
                <div className={styles.stageLineActive} style={{ width: `${Math.max(0, (stage - 1) / 3) * 100}%`, right: "auto" }} />
                {[
                  { step: 1, label: "已提交", time: formatShort(detail.createdAt) },
                  { step: 2, label: "处理中", time: formatShort(detail.updatedAt) },
                  { step: 3, label: "待客户确认" },
                  { step: 4, label: "已完成" },
                ].map((item) => (
                  <div key={item.step} className={styles.stageItem}>
                    <div
                      className={`${styles.stageDot} ${
                        item.step < stage
                          ? styles.stageDone
                          : item.step === stage
                            ? styles.stageActive
                            : styles.stagePending
                      }`}
                    >
                      {item.step}
                    </div>
                    <div className={item.step === stage ? styles.stageLabelActive : styles.stageLabel}>
                      {item.label}
                    </div>
                    {item.time ? <div className={styles.stageTime}>{item.time}</div> : null}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.gridMain}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <article className={styles.card}>
                <h3 className={styles.sectionTitle}>咨询内容</h3>
                <div className={styles.chatList}>
                  {detail.messages.map((message) => renderMessage(message, detail))}
                </div>
              </article>

              <article className={styles.card}>
                <div className={styles.replyCard}>
                  <textarea
                    className={styles.replyTextarea}
                    placeholder="请输入回复内容..."
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                  />
                  <div className={styles.replyToolbar}>
                    <div className={styles.replyTools}>
                      <button type="button" className={styles.iconBtn} aria-label="表情">
                        <Smile size={18} aria-hidden />
                      </button>
                      <button type="button" className={styles.iconBtn} aria-label="图片">
                        <ImageIcon size={18} aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      disabled
                      title="回复功能即将上线"
                    >
                      发送
                    </button>
                  </div>
                </div>
                <div className={styles.replyLinks}>
                  <button type="button" className={styles.replyLink}>
                    <Zap size={14} aria-hidden />
                    快速回复
                  </button>
                  <button type="button" className={styles.replyLink}>
                    <Upload size={14} aria-hidden />
                    添加附件
                  </button>
                </div>
              </article>
            </div>

            <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <article className={styles.card}>
                <h3 className={styles.sectionTitle}>工单处理记录</h3>
                <div className={styles.timeline}>
                  {timeline.map((event, index) => (
                    <div key={event.id} className={styles.timelineItem}>
                      <span className={styles.timelineDot} />
                      {index < timeline.length - 1 ? <span className={styles.timelineLine} /> : null}
                      <div style={{ marginLeft: 8 }}>
                        <div className={styles.timelineTime}>{event.time}</div>
                        <div className={styles.timelineTitle}>{event.title}</div>
                        <div className={styles.timelineDesc}>{event.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                    相关附件
                  </h3>
                  <button type="button" className={styles.replyLink} style={{ fontSize: 12 }}>
                    上传附件
                  </button>
                </div>
                {DEFAULT_ATTACHMENTS.map((file) => (
                  <div key={file.name} className={styles.attachItem}>
                    <div
                      className={`${styles.attachIcon} ${
                        file.type === "pdf" ? styles.attachIconPdf : styles.attachIconVideo
                      }`}
                    >
                      <FileText size={16} aria-hidden />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.attachName}>{file.name}</div>
                      <div className={styles.attachMeta}>{file.meta}</div>
                    </div>
                    <button type="button" className={styles.iconBtn} aria-label="下载">
                      <Download size={16} aria-hidden />
                    </button>
                  </div>
                ))}
              </article>

              <article className={styles.card}>
                <h3 className={styles.sectionTitle}>快捷操作</h3>
                <div className={styles.quickGrid}>
                  <button type="button" className={styles.quickBtn} onClick={() => router.push("/dashboard/knowledge-bases")}>
                    <BookOpen size={18} color="#2563eb" aria-hidden />
                    发送知识库
                  </button>
                  <button type="button" className={styles.quickBtn} disabled title="即将上线">
                    <Package size={18} color="#16a34a" aria-hidden />
                    创建备件申请
                  </button>
                  <button type="button" className={styles.quickBtn} disabled title="即将上线">
                    <CalendarCheck size={18} color="#7c3aed" aria-hidden />
                    预约上门服务
                  </button>
                  <button type="button" className={styles.quickBtn} disabled title="即将上线">
                    <TriangleAlert size={18} color="#ea580c" aria-hidden />
                    转为投诉
                  </button>
                  <button type="button" className={styles.quickBtn} disabled title="即将上线">
                    <ArrowUp size={18} color="#2563eb" aria-hidden />
                    升级工单
                  </button>
                  <button type="button" className={styles.quickBtn} disabled title="即将上线">
                    <StickyNote size={18} color="#64748b" aria-hidden />
                    内部备注
                  </button>
                </div>
              </article>
            </aside>
          </div>
        </>
      ) : detailLoading ? (
        <Skeleton className={styles.card} style={{ height: 480 }} />
      ) : null}
    </div>
  );
}
