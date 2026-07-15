"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  User,
  UserCheck,
  X,
} from "lucide-react";

import type { WorkspaceMemberSummary } from "@/lib/auth/members";
import {
  getFollowTask,
  type FollowTaskDetail,
} from "@/lib/follow-tasks/api";

type TaskPriority = "high" | "medium" | "low";

interface InitialTask {
  id: string;
  title: string;
  customerName: string;
  priority: TaskPriority;
  ownerName: string;
  dueAt: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
}

interface Props {
  taskId: string;
  isPreview: boolean;
  initialTask?: InitialTask;
  members: WorkspaceMemberSummary[];
  previewOwners: string[];
  onClose: () => void;
  onAssign: (ownerId: string, ownerName: string) => void;
  onPatchPriority: (priority: TaskPriority) => void;
  onDelay: (dueAt: string, reason: string) => void;
  onComplete: (result: string) => void;
  onCancel: (reason: string) => void;
}

function formatDateTime(value: string | null | undefined): string {
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

function resolveDetailStatus(detail: FollowTaskDetail): { label: string; tone: string } {
  if (detail.status === "done") return { label: "已完成", tone: "#16a34a" };
  if (detail.status === "cancelled") return { label: "已取消", tone: "#9ca3af" };
  const due = new Date(detail.dueAt).getTime();
  if (!Number.isNaN(due) && due < Date.now()) return { label: "已逾期", tone: "#dc2626" };
  return { label: "待跟进", tone: "#2563eb" };
}

function priorityLabel(priority: TaskPriority): string {
  return priority === "high" ? "高" : priority === "medium" ? "中" : "低";
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 1000,
};

const drawerStyle: React.CSSProperties = {
  width: "min(460px, 100%)",
  height: "100%",
  background: "#fff",
  boxShadow: "-20px 0 50px rgba(15,23,42,0.25)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 14,
  background: "#f8fafc",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#fff",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 6,
  background: "#2563eb",
  color: "#fff",
  fontSize: 14,
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#fff",
  color: "#475569",
  fontSize: 14,
  cursor: "pointer",
};

export function FollowTaskDetailDrawer({
  taskId,
  isPreview,
  initialTask,
  members,
  previewOwners,
  onClose,
  onAssign,
  onPatchPriority,
  onDelay,
  onComplete,
  onCancel,
}: Props) {
  const [detail, setDetail] = useState<FollowTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [delayOpen, setDelayOpen] = useState(false);
  const [delayDueAt, setDelayDueAt] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeResult, setCompleteResult] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const buildPreviewDetail = useCallback((): FollowTaskDetail => {
    return {
      id: initialTask?.id ?? taskId,
      title: initialTask?.title ?? "跟进任务",
      dueAt: initialTask?.dueAt ? new Date(`${initialTask.dueAt.replace(" ", "T")}`).toISOString() : new Date().toISOString(),
      status: initialTask?.status === "completed" ? "done" : initialTask?.status === "overdue" ? "pending" : "pending",
      inquiryId: null,
      assigneeUserId: null,
      priority: initialTask?.priority ?? "medium",
      delayReason: null,
      completionResult: null,
      completedAt: null,
      cancelReason: null,
      note: null,
      customerName: initialTask?.customerName ?? null,
    };
  }, [initialTask, taskId]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isPreview) {
        setDetail(buildPreviewDetail());
        return;
      }
      const next = await getFollowTask(taskId);
      setDetail(next);
    } catch {
      setDetail(buildPreviewDetail());
      setError("未能加载任务详情，已按列表数据展示。");
    } finally {
      setLoading(false);
    }
  }, [isPreview, buildPreviewDetail, taskId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const ownerName = (() => {
    if (!detail) return initialTask?.ownerName ?? "未分配";
    if (detail.assigneeUserId) {
      const member = members.find((m) => m.userId === detail.assigneeUserId);
      if (member) return member.name;
      return isPreview ? initialTask?.ownerName ?? "已分配" : "已分配";
    }
    return "未分配";
  })();

  const isClosed = detail?.status === "done" || detail?.status === "cancelled";
  const status = detail ? resolveDetailStatus(detail) : null;

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={drawerStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>任务详情</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {detail?.customerName ?? initialTask?.customerName ?? "—"}
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {error ? (
            <div style={{ fontSize: 13, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10 }}>
              {error}
            </div>
          ) : null}

          {loading || !detail ? (
            <div style={{ color: "#94a3b8", fontSize: 14, padding: 20, textAlign: "center" }}>加载中…</div>
          ) : (
            <>
              <div style={{ ...sectionStyle, background: "#fff" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{detail.title}</div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: status?.tone,
                      background: `${status?.tone}1a`,
                      borderRadius: 999,
                      padding: "2px 10px",
                    }}
                  >
                    {status?.label}
                  </span>
                  <span style={{ fontSize: 13, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} /> {formatDateTime(detail.dueAt)}
                  </span>
                </div>
              </div>

              {/* 负责人 */}
              <div style={sectionStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#475569", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <User size={14} /> 负责人
                  </span>
                  {!assignOpen && !isClosed ? (
                    <button
                      type="button"
                      style={{ ...btnOutline, padding: "4px 10px", fontSize: 12 }}
                      onClick={() => {
                        setAssignOwnerId("");
                        setAssignOpen(true);
                      }}
                    >
                      分配
                    </button>
                  ) : null}
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{ownerName}</div>
                {assignOpen ? (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <select style={inputStyle} value={assignOwnerId} onChange={(e) => setAssignOwnerId(e.target.value)}>
                      <option value="">请选择负责人</option>
                      {isPreview
                        ? previewOwners.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))
                        : members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name}（{member.role}）
                            </option>
                          ))}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={btnPrimary}
                        disabled={!assignOwnerId || actionBusy}
                        onClick={() => {
                          const name = isPreview
                            ? assignOwnerId
                            : members.find((m) => m.userId === assignOwnerId)?.name ?? assignOwnerId;
                          setAssignOpen(false);
                          onAssign(assignOwnerId, name);
                        }}
                      >
                        {actionBusy ? "处理中…" : "确认分配"}
                      </button>
                      <button type="button" style={btnOutline} onClick={() => setAssignOpen(false)}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 优先级 */}
              <div style={sectionStyle}>
                <div style={{ fontSize: 13, color: "#475569", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Flag size={14} /> 优先级
                </div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <select
                    style={inputStyle}
                    value={detail.priority}
                    disabled={isClosed}
                    onChange={(e) => onPatchPriority(e.target.value as TaskPriority)}
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 999,
                      padding: "2px 10px",
                      color: detail.priority === "high" ? "#dc2626" : detail.priority === "medium" ? "#d97706" : "#2563eb",
                      background: detail.priority === "high" ? "#fee2e2" : detail.priority === "medium" ? "#fef3c7" : "#dbeafe",
                    }}
                  >
                    {priorityLabel(detail.priority)}
                  </span>
                </div>
              </div>

              {/* 延期原因 */}
              <div style={sectionStyle}>
                <div style={{ fontSize: 13, color: "#475569", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} /> 延期原因
                </div>
                {detail.delayReason ? (
                  <div style={{ marginTop: 8, fontSize: 14, color: "#0f172a" }}>{detail.delayReason}</div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>暂无延期记录</div>
                )}
                {!delayOpen && !isClosed ? (
                  <button
                    type="button"
                    style={{ ...btnOutline, padding: "4px 10px", fontSize: 12, marginTop: 10 }}
                    onClick={() => {
                      setDelayDueAt(detail.dueAt ? detail.dueAt.slice(0, 10) : "");
                      setDelayReason("");
                      setDelayOpen(true);
                    }}
                  >
                    标记延期
                  </button>
                ) : null}
                {delayOpen ? (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input style={inputStyle} type="date" value={delayDueAt} onChange={(e) => setDelayDueAt(e.target.value)} />
                    <input
                      style={inputStyle}
                      placeholder="延期原因（如：客户出差，延后至下周）"
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={btnPrimary}
                        disabled={!delayDueAt || actionBusy}
                        onClick={() => {
                          setDelayOpen(false);
                          onDelay(new Date(`${delayDueAt}T09:00:00`).toISOString(), delayReason);
                        }}
                      >
                        {actionBusy ? "处理中…" : "确认延期"}
                      </button>
                      <button type="button" style={btnOutline} onClick={() => setDelayOpen(false)}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 完成结果 */}
              <div style={sectionStyle}>
                <div style={{ fontSize: 13, color: "#475569", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} /> 完成结果
                </div>
                {detail.status === "done" ? (
                  <div style={{ marginTop: 8, fontSize: 14, color: "#0f172a" }}>
                    {detail.completionResult || "（已完成，未填写结果说明）"}
                  </div>
                ) : detail.status === "cancelled" ? (
                  <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
                    已取消{detail.cancelReason ? `：${detail.cancelReason}` : ""}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>任务未完成</div>
                )}
                {!completeOpen && !isClosed ? (
                  <button
                    type="button"
                    style={{ ...btnOutline, padding: "4px 10px", fontSize: 12, marginTop: 10 }}
                    onClick={() => {
                      setCompleteResult("");
                      setCompleteOpen(true);
                    }}
                  >
                    标记完成
                  </button>
                ) : null}
                {completeOpen ? (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      style={inputStyle}
                      placeholder="完成结果（如：已电话确认，客户接受方案）"
                      value={completeResult}
                      onChange={(e) => setCompleteResult(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={btnPrimary}
                        disabled={actionBusy}
                        onClick={() => {
                          setCompleteOpen(false);
                          onComplete(completeResult);
                        }}
                      >
                        {actionBusy ? "处理中…" : "确认完成"}
                      </button>
                      <button type="button" style={btnOutline} onClick={() => setCompleteOpen(false)}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 取消任务 */}
              {!isClosed ? (
                <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 12 }}>
                  {!cancelOpen ? (
                    <button
                      type="button"
                      style={{ ...btnOutline, borderColor: "#fca5a5", color: "#dc2626", fontSize: 13, padding: "6px 12px" }}
                      onClick={() => {
                        setCancelReason("");
                        setCancelOpen(true);
                      }}
                    >
                      取消任务
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        style={inputStyle}
                        placeholder="取消原因（可选）"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          style={{ ...btnPrimary, background: "#dc2626" }}
                          disabled={actionBusy}
                          onClick={() => {
                            setCancelOpen(false);
                            onCancel(cancelReason);
                          }}
                        >
                          {actionBusy ? "处理中…" : "确认取消"}
                        </button>
                        <button type="button" style={btnOutline} onClick={() => setCancelOpen(false)}>
                          返回
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {isClosed ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
                  <AlertCircle size={14} /> 该任务已结束，仅展示结果记录。
                </div>
              ) : null}
            </>
          )}
        </div>

        <div style={{ borderTop: "1px solid #e2e8f0", padding: 14, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" style={btnOutline} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
