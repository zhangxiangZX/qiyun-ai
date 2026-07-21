"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle,
  ChevronDown,
  Circle,
  Copy,
  Download,
  FileText,
  Flag,
  ListTodo,
  Phone,
  RefreshCw,
  Send,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  addQuoteFollowUp,
  downloadCurrentQuotePdf,
  downloadQuoteDocument,
  getInquiry,
  getQuoteOpportunity,
  listQuoteDeliveryLogs,
  listQuoteDocuments,
  retryQuoteDelivery,
  sendQuote,
  updateQuoteOpportunity,
  type QuoteDeliveryLog,
  type QuoteDocumentVersion,
} from "@/lib/sales/api";
import { resolveReturnTo } from "@/lib/sales/list-return";
import type { InquiryDetail, QuoteDetail } from "@/lib/sales/types";
import { QUOTE_STAGE_LABELS } from "@/lib/sales/types";
import styles from "@/styles/quote-detail.module.css";

interface ProgressStep {
  id: string;
  title: string;
  status: "done" | "current" | "pending";
  sub?: string;
  time?: string;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "--";
  return `¥ ${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function quoteNumber(detail: QuoteDetail): string {
  const date = new Date(detail.createdAt);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `QT-${year}${month}${day}-${detail.id.slice(-4).toUpperCase()}`;
  }
  return `QT-${detail.id.slice(0, 8).toUpperCase()}`;
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "已逾期";
  if (diff === 0) return "今天到期";
  return `剩余 ${diff} 天`;
}

function initials(name: string): string {
  const text = name.trim();
  return text ? text.charAt(0).toUpperCase() : "?";
}

function resolveOwnerName(detail: QuoteDetail): string {
  if (!detail.ownerId) return "未分配";
  return detail.ownerId.replace(/^sales_/, "销售 ").replaceAll("_", " ");
}

function resolveStageLabel(detail: QuoteDetail): string {
  return detail.stageLabel || QUOTE_STAGE_LABELS[detail.stage] || detail.stage;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const DELIVERY_STATUS_META: Record<string, { label: string; cls: string }> = {
  queued: { label: "排队中", cls: "bg-amber-100 text-amber-700" },
  sent: { label: "已发送", cls: "bg-blue-100 text-blue-700" },
  delivered: { label: "已送达", cls: "bg-emerald-100 text-emerald-700" },
  failed: { label: "失败", cls: "bg-red-100 text-red-700" },
  bounced: { label: "退回", cls: "bg-red-100 text-red-700" },
};

function deliveryStatusMeta(status: string): { label: string; cls: string } {
  return DELIVERY_STATUS_META[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
}

function buildProgress(detail: QuoteDetail, inquiry: InquiryDetail | null): ProgressStep[] {
  const createdTime = formatDateTime(inquiry?.createdAt ?? detail.createdAt);
  const sentTime = formatDateTime(detail.updatedAt);

  return [
    {
      id: "collecting",
      title: "需求确认",
      status: "done",
      time: createdTime,
    },
    {
      id: "to_quote",
      title: "内部报价准备",
      status: ["collecting", "engineering_review", "to_quote"].includes(detail.stage)
        ? "current"
        : "done",
      time: createdTime,
    },
    {
      id: "quoted",
      title: "报价已发出",
      status: ["quoted", "confirming", "won"].includes(detail.stage)
        ? "done"
        : detail.stage === "lost"
          ? "pending"
          : "pending",
      sub: ["quoted", "confirming", "won"].includes(detail.stage)
        ? `已发送给 ${detail.customerName}`
        : undefined,
      time: ["quoted", "confirming", "won"].includes(detail.stage) ? sentTime : undefined,
    },
    {
      id: "confirming",
      title: "客户确认中",
      status:
        detail.stage === "confirming"
          ? "current"
          : detail.stage === "won"
            ? "done"
            : "pending",
      time: detail.stage === "won" ? formatDateTime(detail.updatedAt) : undefined,
    },
    {
      id: "won",
      title: "成交 / 关闭",
      status: detail.stage === "won" ? "done" : detail.stage === "lost" ? "current" : "pending",
      sub: detail.stage === "lost" ? "本次报价已标记为丢单" : undefined,
      time: ["won", "lost"].includes(detail.stage) ? formatDateTime(detail.updatedAt) : undefined,
    },
  ];
}

function pickField(fields: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function QuoteDetailWorkspace({ quoteId }: { quoteId?: string | null } = {}) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const resolvedId = quoteId ?? params.id;
  const backHref = resolveReturnTo(searchParams.get("returnTo"), "/dashboard/quotes");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState("电话确认项目参数与交付时间。");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [documents, setDocuments] = useState<QuoteDocumentVersion[]>([]);
  const [deliveries, setDeliveries] = useState<QuoteDeliveryLog[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendChannel, setSendChannel] = useState<"email" | "link">("email");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [stageUpdating, setStageUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    setError(null);

    try {
      const quote = await getQuoteOpportunity(resolvedId);
      setDetail(quote);
      setNextFollowUp(quote.nextFollowUpAt ? formatDateTime(quote.nextFollowUpAt) : "");

      try {
        const nextInquiry = await getInquiry(quote.inquiryId);
        setInquiry(nextInquiry);
      } catch {
        setInquiry(null);
      }
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadArtifacts = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : false;
      if (preview) {
        setDocuments([]);
        setDeliveries([]);
        return;
      }
      const [docs, logs] = await Promise.all([
        listQuoteDocuments(resolvedId),
        listQuoteDeliveryLogs(resolvedId),
      ]);
      setDocuments(docs);
      setDeliveries(logs);
    } catch {
      setDocuments([]);
      setDeliveries([]);
    }
  }, [resolvedId]);

  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const handleExportPdf = useCallback(async () => {
    if (!detail) return;
    setDownloading("current");
    try {
      await downloadCurrentQuotePdf(detail.id, `${quoteNumber(detail)}.pdf`);
    } catch (nextError) {
      setNotice(getApiErrorMessage(nextError, "PDF 下载失败。"));
    } finally {
      setDownloading(null);
    }
  }, [detail]);

  const handleDownloadVersion = useCallback(
    async (doc: QuoteDocumentVersion) => {
      if (!detail) return;
      setDownloading(doc.id);
      try {
        await downloadQuoteDocument(detail.id, doc.id, doc.fileName);
      } catch (nextError) {
        setNotice(getApiErrorMessage(nextError, "PDF 下载失败。"));
      } finally {
        setDownloading(null);
      }
    },
    [detail],
  );

  const handleSend = useCallback(async () => {
    if (!detail) return;
    setSending(true);
    setSendError(null);
    try {
      await sendQuote(detail.id, {
        recipient: sendRecipient.trim() || undefined,
        channel: sendChannel,
      });
      setSendOpen(false);
      setSendRecipient("");
      setNotice("报价已发送，可在「发送记录」中查看状态。");
      await Promise.all([load(), loadArtifacts()]);
    } catch (nextError) {
      setSendError(getApiErrorMessage(nextError, "发送失败，请稍后重试。"));
    } finally {
      setSending(false);
    }
  }, [detail, sendChannel, sendRecipient, loadArtifacts, load]);

  const handleRetryDelivery = useCallback(
    async (log: QuoteDeliveryLog) => {
      if (!detail) return;
      try {
        await retryQuoteDelivery(detail.id, log.id);
        setNotice("已重新发送该记录。");
        await loadArtifacts();
      } catch (nextError) {
        setNotice(getApiErrorMessage(nextError, "重试失败。"));
      }
    },
    [detail, loadArtifacts],
  );

  const ownerName = useMemo(() => (detail ? resolveOwnerName(detail) : "未分配"), [detail]);
  const progress = useMemo(() => (detail ? buildProgress(detail, inquiry) : []), [detail, inquiry]);

  const internalNote = useMemo(() => {
    const note = detail?.followUps.find((item) => item.kind === "note");
    if (note) {
      return {
        body: note.body || note.title,
        actor: note.actor || ownerName,
        time: formatDateTime(note.createdAt),
      };
    }
    return {
      body: "当前报价页还没有内部备注，建议补充客户关键诉求、交期关注点和风险说明。",
      actor: ownerName,
      time: detail ? formatDateTime(detail.updatedAt) : "--",
    };
  }, [detail, ownerName]);

  const customerFields = useMemo(() => {
    const fields = inquiry?.knownFields ?? {};
    return {
      company: detail?.customerName ?? inquiry?.customerName ?? "--",
      contact:
        pickField(fields, ["联系人", "contact", "contactName"]) ??
        inquiry?.customerContact?.split(/[,，]/)[0] ??
        "--",
      phone:
        pickField(fields, ["电话", "phone", "mobile"]) ??
        detail?.customerContact ??
        "--",
      email: pickField(fields, ["邮箱", "email"]) ?? "--",
      region: pickField(fields, ["地区", "region", "country"]) ?? "中国",
      project: pickField(fields, ["项目名称", "project"]) ?? detail?.title ?? "--",
      summary:
        pickField(fields, ["需求摘要", "需求", "requirement"]) ??
        inquiry?.summary ??
        "暂未提取到完整需求摘要，建议结合线索详情补充项目背景和采购范围。",
    };
  }, [detail, inquiry]);

  const summary = useMemo(() => {
    const estimated = detail?.estimatedAmount ?? null;
    const quoted = detail?.quotedAmount ?? null;
    const won = detail?.wonAmount ?? null;
    return {
      estimated,
      quoted,
      won,
      current: won ?? quoted ?? estimated,
    };
  }, [detail]);

  async function handleStageUpdate(stage: QuoteDetail["stage"]) {
    if (!detail || stageUpdating) return;
    setStageUpdating(true);
    setNotice(null);
    try {
      const updated = await updateQuoteOpportunity(detail.id, { stage });
      setDetail(updated);
      setNotice(stage === "won" ? "已标记成交。" : stage === "lost" ? "已标记丢单。" : "报价状态已更新。");
    } catch (nextError) {
      setNotice(getApiErrorMessage(nextError, "更新报价状态失败，请稍后重试。"));
    } finally {
      setStageUpdating(false);
    }
  }

  async function handleAddFollowUp() {
    if (!detail) return;
    try {
      const updated = await addQuoteFollowUp(detail.id, {
        title: "新增跟进记录",
        body: `${nextAction}${nextFollowUp ? ` 下次跟进：${nextFollowUp}` : ""}`,
      });
      setDetail(updated);
      setNotice("跟进记录已添加。");
    } catch (nextError) {
      setNotice(getApiErrorMessage(nextError, "创建跟进记录失败。"));
    }
  }

  function copyQuoteNo() {
    if (!detail) return;
    void navigator.clipboard.writeText(quoteNumber(detail)).then(() => {
      setNotice("报价单号已复制。");
    });
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载报价详情…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    const presentation = resolveRequestErrorPresentation(
      error ?? new Error("报价不存在。"),
      "报价不存在。",
    );
    return <ConsoleRequestError kind={presentation.kind} message={presentation.message} onRetry={load} />;
  }

  const validity = daysUntil(detail.quoteDueAt);
  const stageLabel = resolveStageLabel(detail);

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.pageHeader}>
        <div>
          <Link href={backHref} className={styles.statsLink}>
            ← 返回报价列表
          </Link>
          <h1>报价详情</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnOutline}
            disabled={downloading === "current"}
            onClick={() => void handleExportPdf()}
          >
            <Download size={14} /> {downloading === "current" ? "生成中" : "导出 PDF"}
          </button>
          <Link href={`/dashboard/quotes/${detail.id}/preview`} className={styles.btnOutline}>
            <FileText size={14} /> 预览报价
          </Link>
          <button type="button" className={styles.btnOutline} onClick={copyQuoteNo}>
            <Copy size={14} /> 复制报价单号
          </button>
          <button type="button" className={styles.btnOutline} onClick={() => setSendOpen(true)}>
            <Send size={14} /> 发送给客户
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={stageUpdating}
            onClick={() => void handleStageUpdate("confirming")}
          >
            <RefreshCw size={14} /> 标记为客户确认中 <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {sendOpen && detail ? (
        <div className={styles.card} style={{ borderColor: "var(--primary, #1768f2)" }}>
          <div className={styles.noteHead}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>
              发送给客户
            </h2>
            <button
              type="button"
              className={styles.copyIcon}
              onClick={() => setSendOpen(false)}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label htmlFor="send-recipient">接收邮箱 / 链接接收人</label>
              <input
                id="send-recipient"
                value={sendRecipient}
                onChange={(event) => setSendRecipient(event.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="send-channel">发送渠道</label>
              <select
                id="send-channel"
                value={sendChannel}
                onChange={(event) => setSendChannel(event.target.value as "email" | "link")}
              >
                <option value="email">邮件</option>
                <option value="link">客户链接</option>
              </select>
            </div>
            {sendError ? <div className={styles.notice}>{sendError}</div> : null}
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={sending}
              onClick={() => void handleSend()}
            >
              {sending ? "发送中…" : "确认发送"}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>报价概览</h2>
            <div className={styles.grid4}>
              <div>
                <div className={styles.fieldLabel}>报价单号</div>
                <div className={styles.fieldValue}>
                  {quoteNumber(detail)}
                  <button type="button" className={styles.copyIcon} onClick={copyQuoteNo} aria-label="复制报价单号">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className={styles.span2}>
                <div className={styles.fieldLabel}>报价标题</div>
                <div className={styles.fieldValue}>{detail.title}</div>
              </div>
              <div>
                <div className={styles.fieldLabel}>当前状态</div>
                <span className={styles.statusBadge}>{stageLabel}</span>
              </div>
              <div className={styles.span2}>
                <div className={styles.fieldLabel}>客户公司</div>
                <div className={styles.fieldValue}>{detail.customerName}</div>
              </div>
              <div className={styles.span2}>
                <div className={styles.fieldLabel}>销售负责人</div>
                <div className={styles.ownerRow}>
                  <span className={styles.avatar}>{initials(ownerName)}</span>
                  <span className={styles.fieldValue}>{ownerName}</span>
                </div>
              </div>
              <div>
                <div className={styles.fieldLabel}>创建时间</div>
                <div className={styles.fieldValueNormal}>{formatDateTime(detail.createdAt)}</div>
              </div>
              <div>
                <div className={styles.fieldLabel}>有效期至</div>
                <div className={styles.fieldValueNormal}>
                  {detail.quoteDueAt ? formatDateTime(detail.quoteDueAt).split(" ")[0] : "--"}
                  {validity ? <span className={styles.daysLeft}>（{validity}）</span> : null}
                </div>
              </div>
              <div>
                <div className={styles.fieldLabel}>线索编号</div>
                <div className={styles.fieldValueNormal}>{detail.inquiryId}</div>
              </div>
              <div>
                <div className={styles.fieldLabel}>丢单原因</div>
                <div className={styles.fieldValueNormal}>{detail.lostReason ?? "--"}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>客户信息</h2>
            <div className={styles.grid4}>
              <div className={styles.span2}>
                <div className={styles.fieldLabel}>公司名称</div>
                <div className={styles.fieldValue}>{customerFields.company}</div>
              </div>
              <div>
                <div className={styles.fieldLabel}>联系人</div>
                <div className={styles.fieldValueNormal}>{customerFields.contact}</div>
              </div>
              <div>
                <div className={styles.fieldLabel}>联系电话</div>
                <div className={styles.fieldValueNormal}>{customerFields.phone}</div>
              </div>
              <div className={styles.span2}>
                <div className={styles.fieldLabel}>邮箱</div>
                <div className={styles.fieldValueNormal}>{customerFields.email}</div>
              </div>
              <div>
                <div className={styles.fieldLabel}>地区</div>
                <div className={styles.fieldValueNormal}>{customerFields.region}</div>
              </div>
              <div className={styles.span2}>
                <div className={styles.fieldLabel}>项目名称</div>
                <div className={styles.fieldValueNormal}>{customerFields.project}</div>
              </div>
              <div className={styles.span3}>
                <div className={styles.fieldLabel}>需求摘要</div>
                <div className={styles.fieldValueNormal}>{customerFields.summary}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>报价金额摘要</h2>
            <div className={styles.summaryRow}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>预估金额</div>
                <div className={styles.summaryValue}>{formatCurrency(summary.estimated)}</div>
              </div>
              <div className={styles.summaryOp}>→</div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>已报价金额</div>
                <div className={styles.summaryValue}>{formatCurrency(summary.quoted)}</div>
              </div>
              <div className={styles.summaryOp}>→</div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>成交金额</div>
                <div className={styles.summaryValue}>{formatCurrency(summary.won)}</div>
              </div>
              <div className={styles.summaryOp}>=</div>
              <div className={styles.totalBox}>
                <div className={styles.totalLabel}>当前参考金额</div>
                <div className={styles.totalValue}>{formatCurrency(summary.current)}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.noteHead}>
              <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                内部备注
              </h2>
            </div>
            <p className={styles.noteText}>{internalNote.body}</p>
            <div className={styles.noteMeta}>
              <span>{internalNote.actor}</span>
              <span>{internalNote.time}</span>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>附件</h2>
            <div className={styles.attachGrid}>
              <div className={styles.attachCard}>
                <div className={styles.attachBody}>
                  <div className={styles.attachName}>当前报价暂未上传独立附件</div>
                  <div className={styles.attachSize}>如需图纸、清单或 PDF，可在后续报价流程中补充。</div>
                </div>
                <FileText size={16} color="#9ca3af" />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>PDF 版本历史</h2>
            {documents.length === 0 ? (
              <p className={styles.fieldValueNormal}>
                暂无历史版本。点击右上角「导出 PDF」可生成当前版本并记录到此处。
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        v{doc.version} · {doc.fileName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(doc.createdAt)} · {formatBytes(doc.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.btnOutline}
                      disabled={downloading === doc.id}
                      onClick={() => void handleDownloadVersion(doc)}
                    >
                      <Download size={14} /> {downloading === doc.id ? "下载中" : "下载"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>发送记录</h2>
            {deliveries.length === 0 ? (
              <p className={styles.fieldValueNormal}>
                暂无发送记录。点击右上角「发送给客户」发起首次发送。
              </p>
            ) : (
              <div className="space-y-2">
                {deliveries.map((log) => {
                  const meta = deliveryStatusMeta(log.status);
                  const canRetry = log.status === "failed" || log.status === "queued";
                  return (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-background px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <span>{log.channel === "email" ? "邮件" : "客户链接"}</span>
                          <span className="text-muted-foreground">· {log.recipient}</span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                          {log.errorMessage ? ` · 失败原因：${log.errorMessage}` : ""}
                        </div>
                      </div>
                      {canRetry ? (
                        <button
                          type="button"
                          className={styles.btnOutline}
                          onClick={() => void handleRetryDelivery(log)}
                        >
                          <RefreshCw size={14} /> 重试
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>报价进度</h2>
            <div className={styles.timeline}>
              <div className={styles.timelineLine} />
              <div className={styles.timelineList}>
                {progress.map((step) => (
                  <div key={step.id} className={styles.timelineItem}>
                    <div
                      className={`${styles.timelineDot} ${
                        step.status === "done"
                          ? styles.dotDone
                          : step.status === "current"
                            ? styles.dotCurrent
                            : styles.dotPending
                      }`}
                    >
                      {step.status === "done" ? <Check size={14} /> : <Circle size={8} fill="currentColor" />}
                    </div>
                    <div>
                      <div className={step.status === "pending" ? styles.timelineTitleMuted : styles.timelineTitle}>
                        {step.title}
                      </div>
                      {step.sub ? <div className={styles.timelineSub}>{step.sub}</div> : null}
                      <div className={styles.timelineTime}>{step.time ?? (step.status === "pending" ? "--" : "")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>客户跟进</h2>
            <div className={styles.fieldStack}>
              <div className={styles.field}>
                <label htmlFor="next-action">下一步动作</label>
                <input
                  id="next-action"
                  value={nextAction}
                  onChange={(event) => setNextAction(event.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="next-follow">下次跟进时间</label>
                <input
                  id="next-follow"
                  value={nextFollowUp}
                  onChange={(event) => setNextFollowUp(event.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>负责人</label>
                <div className={styles.ownerSelect}>
                  <span className={styles.avatar}>{initials(ownerName)}</span>
                  <span>{ownerName}</span>
                </div>
              </div>
              <button type="button" className={styles.editPlanBtn} onClick={() => void handleAddFollowUp()}>
                保存跟进记录
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>快捷操作</h2>
            <div className={styles.quickGrid}>
              <button type="button" className={styles.quickBtn}>
                <Phone size={14} color="#3b82f6" /> 联系客户
              </button>
              <button type="button" className={styles.quickBtn} disabled={stageUpdating} onClick={() => void handleStageUpdate("won")}>
                <CheckCircle size={14} color="#22c55e" /> 标记成交
              </button>
              <button type="button" className={styles.quickBtn} disabled={stageUpdating} onClick={() => void handleStageUpdate("lost")}>
                <Flag size={14} color="#ef4444" /> 标记丢单
              </button>
              <button type="button" className={styles.quickBtn} onClick={() => void handleAddFollowUp()}>
                <ListTodo size={14} color="#3b82f6" /> 新增跟进
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>报价统计</h2>
            <div className={styles.statsGrid}>
              <div>
                <div className={styles.statLabel}>跟进记录数</div>
                <div className={styles.statValue}>{detail.followUps.length}</div>
              </div>
              <div>
                <div className={styles.statLabel}>当前报价金额</div>
                <div className={styles.statValue}>{formatCurrency(summary.current)}</div>
              </div>
              <div>
                <div className={styles.statLabel}>最新更新时间</div>
                <div className={styles.statValue}>{formatDateTime(detail.updatedAt)}</div>
              </div>
              <div>
                <div className={styles.statLabel}>客户状态</div>
                <div className={styles.statValue}>{stageLabel}</div>
              </div>
            </div>
            <Link href="/dashboard/leads" className={styles.statsLink}>
              查看相关线索
              <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
