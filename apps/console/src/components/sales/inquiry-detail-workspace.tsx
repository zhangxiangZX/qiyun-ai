"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Flame,
  MessageSquare,
  Paperclip,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
} from "@/components/console/console-page-shell";
import { InquiryModuleNav } from "@/components/sales/inquiry-module-nav";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import {
  convertInquiryToQuote,
  getInquiry,
  markInquiryInvalid,
  markInquiryLost,
  requestMissingFields,
} from "@/lib/sales/api";
import type { InquiryDetail } from "@/lib/sales/types";
import { INTENT_LABELS, SOURCE_TYPE_LABELS } from "@/lib/sales/types";
import styles from "@/styles/inquiry-detail.module.css";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const DEMO_KNOWN_FIELDS: Record<string, string> = {
  防护等级: "IP65",
  尺寸规格: "600×800×2000mm",
  材质: "不锈钢",
  温控需求: "需要机柜空调",
  数量: "20 台",
  交期: "2024-06-30 前",
};

const FOLLOW_LOG = [
  { time: "2024-06-04 10:23", person: "张伟", method: "电话", summary: "确认防护等级与交期要求", result: "有效沟通", resultTone: "green", next: "发送报价单" },
  { time: "2024-06-04 09:18", person: "张伟", method: "邮件", summary: "发送产品手册与技术参数", result: "资料已发", resultTone: "blue", next: "等待客户反馈" },
  { time: "2024-06-03 16:45", person: "系统", method: "表单", summary: "客户提交官网询盘表单", result: "新询盘", resultTone: "gray", next: "分配负责人" },
];

export function InquiryDetailWorkspace({ inquiryId }: { inquiryId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!inquiryId) return;
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      setIsPreview(mode ? isPreviewMode(mode) : true);
      const data = await getInquiry(inquiryId);
      setInquiry(data);
    } catch (nextError) {
      setError(nextError);
      setInquiry(null);
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (label: string, action: () => Promise<void>) => {
      if (!inquiryId || isPreview) return;
      setActionBusy(true);
      setActionError(null);
      setActionMessage(null);
      try {
        await action();
        setActionMessage(`${label}成功。`);
        await load();
      } catch (nextError) {
        if (isPreviewModeError(nextError)) {
          setActionMessage(`${label}成功。（预览模式）`);
        } else {
          setActionError(nextError instanceof Error ? nextError.message : `${label}失败。`);
        }
      } finally {
        setActionBusy(false);
      }
    },
    [inquiryId, isPreview, load],
  );

  const handleConvertToQuote = useCallback(async () => {
    if (!inquiryId) return;
    await runAction("创建报价", async () => {
      const quote = await convertInquiryToQuote(inquiryId, {
        title: inquiry?.summary ?? undefined,
      });
      router.push(`/dashboard/quotes/${encodeURIComponent(quote.id)}`);
    });
  }, [inquiry?.summary, inquiryId, router, runAction]);

  const handleMarkLost = useCallback(async () => {
    await runAction("标记丢单", async () => {
      await markInquiryLost(inquiryId!);
    });
  }, [inquiryId, runAction]);

  const handleMarkInvalid = useCallback(async () => {
    await runAction("标记无效", async () => {
      await markInquiryInvalid(inquiryId!);
    });
  }, [inquiryId, runAction]);

  const handleRequestMissing = useCallback(async () => {
    await runAction("索取补充资料", async () => {
      await requestMissingFields(inquiryId!);
    });
  }, [inquiryId, runAction]);

  if (!inquiryId) {
    return (
      <ConsolePage>
        <ConsoleRequestError message="未指定询盘 ID，请从询盘中心进入。" />
      </ConsolePage>
    );
  }

  const knownFields = inquiry?.knownFields && Object.keys(inquiry.knownFields).length
    ? inquiry.knownFields
    : isPreview
      ? DEMO_KNOWN_FIELDS
      : {};
  const timelineMessages =
    inquiry?.messages?.length
      ? inquiry.messages.map((message) => ({
          time: formatDateTime(message.createdAt),
          text: message.content,
          role: message.role,
        }))
      : isPreview
        ? [
            { time: "2024-06-04 10:23", text: "客户提交了表单：设备采购需求", role: "user" as const },
            { time: "2024-06-04 10:24", text: "AI 处理并提取关键参数", role: "assistant" as const },
          ]
        : [];

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="询盘详情" />
        {isPreview ? (
          <ConsoleReadOnlyNotice
            title="预览模式"
            description="写操作在预览模式下不可用，可查看页面结构与演示数据。"
          />
        ) : null}
        {actionMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}
        {actionError ? (
          <ConsoleRequestError message={actionError} onRetry={() => setActionError(null)} />
        ) : null}
      </ConsolePageAlerts>

      <div className={styles.page}>
        <InquiryModuleNav
          pageTitle={`${inquiry?.customerName ?? "询盘"} - 询盘详情`}
          showNewAction={false}
        />

        {loading ? (
          <>
            <Skeleton className="mb-4 h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </>
        ) : error ? (
          <ConsoleRequestError
            {...resolveRequestErrorPresentation(error, "询盘详情加载失败。")}
            onRetry={() => void load()}
          />
        ) : inquiry ? (
          <>
            <div className={styles.headerCard}>
              <div className={styles.headerTop}>
                <div className={styles.customerBlock}>
                  <div className={styles.avatar}>{inquiry.customerName.slice(0, 1)}</div>
                  <div>
                    <h1 className={styles.customerName}>
                      户外机柜采购询盘 - {inquiry.customerName}
                    </h1>
                    <div className={styles.customerSubRow}>
                      <span className={`${styles.tag} ${styles.tagOrange}`}>
                        <Flame size={12} /> {INTENT_LABELS[inquiry.intentLevel]}
                      </span>
                      <span className={`${styles.tag} ${styles.tagGreen}`}>待跟进</span>
                    </div>
                    <div className={styles.metaGrid} style={{ marginTop: 12 }}>
                      <div>
                        <div className={styles.metaLabel}>询盘编号</div>
                        <div className={styles.metaValue}>INQ-202406-000568</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>来源渠道</div>
                        <div className={styles.metaValue}>{SOURCE_TYPE_LABELS[inquiry.sourceType]}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>来源网站</div>
                        <div className={styles.metaValue}>ai.kuzimash.com</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>接收时间</div>
                        <div className={styles.metaValue}>{formatDateTime(inquiry.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                  <button
                    type="button"
                    className={styles.btnSmallPrimary}
                    disabled={actionBusy || isPreview}
                    onClick={() => void handleConvertToQuote()}
                  >
                    创建报价
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    disabled={actionBusy || isPreview}
                    onClick={() => void handleRequestMissing()}
                  >
                    索取补充资料
                  </button>
                  <Link href={`/dashboard/inquiries/assign?focus=${inquiry.id}`} className={styles.quickBtn}>
                    <UserPlus size={14} style={{ display: "inline", marginRight: 4 }} />
                    分配负责人
                  </Link>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    disabled={actionBusy || isPreview}
                    onClick={() => void handleMarkLost()}
                  >
                    标为丢单
                  </button>
                  <button
                    type="button"
                    className={styles.quickBtn}
                    disabled={actionBusy || isPreview}
                    onClick={() => void handleMarkInvalid()}
                  >
                    标为无效
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.gridMain}>
              <div className={styles.mainCol}>
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>客户信息</h2>
                  <div className={styles.metaGrid}>
                    <div>
                      <div className={styles.metaLabel}>公司名称</div>
                      <div className={styles.metaValue}>
                        {inquiry.customerName}
                        <span className={`${styles.tag} ${styles.tagBlue}`} style={{ marginLeft: 8 }}>目标客户</span>
                      </div>
                    </div>
                    <div>
                      <div className={styles.metaLabel}>联系人</div>
                      <div className={styles.metaValue}>{inquiry.customerContact ?? "李经理"}</div>
                    </div>
                    <div>
                      <div className={styles.metaLabel}>电话</div>
                      <div className={styles.metaValue}>138 5712 6688</div>
                    </div>
                    <div>
                      <div className={styles.metaLabel}>邮箱</div>
                      <div className={styles.metaValue}>contact@example.com</div>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>需求摘要</h2>
                  <p className={styles.summaryText}>{inquiry.summary ?? "—"}</p>
                  <ul className={styles.nextStepList}>
                    <li className={styles.nextStepItem}>
                      <CheckCircle2 size={14} className={styles.checkIcon} />
                      产品类型：户外机柜
                    </li>
                    <li className={styles.nextStepItem}>
                      <CheckCircle2 size={14} className={styles.checkIcon} />
                      数量：20 台
                    </li>
                    <li className={styles.nextStepItem}>
                      <CheckCircle2 size={14} className={styles.checkIcon} />
                      交期：2024-06-30 前
                    </li>
                  </ul>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitleRow}>
                    <h2 className={styles.sectionTitle}>
                      <span className={styles.aiIcon}>
                        <Sparkles size={14} />
                      </span>
                      AI 提取结果
                    </h2>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 16 }}>
                    <dl>
                      {Object.entries(knownFields).map(([k, v]) => (
                        <div key={k} className={styles.detailRow}>
                          <dt className={styles.detailLabel}>{k}</dt>
                          <dd className={styles.detailValue}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className={styles.completeness}>
                      <div className={styles.completenessHead}>
                        <span className={styles.completenessLabel}>需求完整度</span>
                        <span className={styles.completenessValue}>{inquiry.requirementCompleteness}%</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${inquiry.requirementCompleteness}%` }} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>
                    <Paperclip size={16} style={{ display: "inline", marginRight: 6 }} />
                    附件 / 图纸
                  </h2>
                  {inquiry.attachments.length ? (
                    <ul className={styles.nextStepList}>
                      {inquiry.attachments.map((f) => (
                        <li key={f.id} className={styles.nextStepItem}>{f.fileName}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ display: "flex", gap: 12 }}>
                      {["机柜现场图.jpg", "技术需求.pdf", "规格说明.docx"].map((name) => (
                        <div key={name} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, minWidth: 100, textAlign: "center" }}>
                          <FileText size={24} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>
                    <MessageSquare size={16} style={{ display: "inline", marginRight: 6 }} />
                    会话记录 / 沟通时间线
                  </h2>
                  <ol className={styles.followList}>
                    {timelineMessages.map((item) => (
                      <li key={`${item.time}-${item.text}`} className={styles.followItem}>
                        <span
                          className={styles.followDot}
                          style={{ background: item.role === "user" ? "#22c55e" : "#3b82f6" }}
                        />
                        <div>
                          <div className={styles.followText}>{item.text}</div>
                          <div className={styles.followMeta}>{item.time}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className={styles.card} style={{ background: "#faf5ff", borderColor: "#e9d5ff" }}>
                  <h2 className={styles.cardTitle}>
                    <Sparkles size={16} className="text-purple-500" style={{ display: "inline", marginRight: 6 }} />
                    跟进建议 (AI)
                  </h2>
                  <ul className={styles.nextStepList}>
                    <li className={styles.nextStepItem}>24 小时内发送户外机柜方案与报价单</li>
                    <li className={styles.nextStepItem}>确认现场安装环境与防护等级要求</li>
                    <li className={styles.nextStepItem}>建议安排技术工程师参与方案评审</li>
                  </ul>
                </section>

                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>跟进记录</h2>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                        <th style={{ padding: "10px 8px" }}>时间</th>
                        <th style={{ padding: "10px 8px" }}>跟进人</th>
                        <th style={{ padding: "10px 8px" }}>方式</th>
                        <th style={{ padding: "10px 8px" }}>摘要</th>
                        <th style={{ padding: "10px 8px" }}>结果</th>
                        <th style={{ padding: "10px 8px" }}>下一步</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FOLLOW_LOG.map((row) => (
                        <tr key={row.time} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 8px" }}>{row.time}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <span className={styles.ownerAvatar} style={{ display: "inline-flex", marginRight: 6, width: 22, height: 22, fontSize: 10 }}>
                              {row.person.slice(0, 1)}
                            </span>
                            {row.person}
                          </td>
                          <td style={{ padding: "12px 8px" }}>{row.method}</td>
                          <td style={{ padding: "12px 8px" }}>{row.summary}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <span className={`${styles.tag} ${row.resultTone === "green" ? styles.tagGreen : row.resultTone === "blue" ? styles.tagBlue : styles.tagGray}`}>
                              {row.result}
                            </span>
                          </td>
                          <td style={{ padding: "12px 8px" }}>{row.next}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>

              <aside className={styles.sidebarCol}>
                <section className={styles.card}>
                  <h3 className={styles.sectionTitle}>需求完整度</h3>
                  <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0" }}>{inquiry.requirementCompleteness}%</p>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${inquiry.requirementCompleteness}%` }} />
                  </div>
                  {inquiry.missingFields.length ? (
                    <ul className={styles.nextStepList} style={{ marginTop: 12 }}>
                      {inquiry.missingFields.map((f) => (
                        <li key={f} className={styles.nextStepItem} style={{ color: "#ea580c" }}>待补充：{f}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <section className={styles.card}>
                  <h3 className={styles.sectionTitle}>快捷操作</h3>
                  <div className={styles.quickGrid}>
                    <button
                      type="button"
                      className={styles.quickBtn}
                      disabled={actionBusy || isPreview}
                      onClick={() => void handleRequestMissing()}
                    >
                      索取补充资料
                    </button>
                    <button
                      type="button"
                      className={styles.quickBtn}
                      disabled={actionBusy || isPreview}
                      onClick={() => void handleMarkLost()}
                    >
                      标记丢单
                    </button>
                    <button
                      type="button"
                      className={`${styles.quickBtn} ${styles.quickBtnWide}`}
                      disabled={actionBusy || isPreview}
                      onClick={() => void handleConvertToQuote()}
                    >
                      创建报价
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </ConsolePage>
  );
}
