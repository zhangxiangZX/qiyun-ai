"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Mail,
  Paperclip,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserPlus,
} from "lucide-react";

import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  analyzeSalesAssistant,
  createRequirementSheet,
  listInquiries,
} from "@/lib/sales/api";
import type { InquiryListItem, SalesAssistantResult } from "@/lib/sales/types";
import styles from "@/styles/sales-assistant.module.css";

type ResultTab = "reply" | "missing" | "products" | "risk" | "follow";
type InputMode = "paste" | "inquiry";

const RESULT_TABS: { id: ResultTab; label: string }[] = [
  { id: "reply", label: "专业回复建议" },
  { id: "missing", label: "关键参数缺失" },
  { id: "products", label: "推荐产品方向" },
  { id: "risk", label: "风险提醒" },
  { id: "follow", label: "跟进话术" },
];

const DEFAULT_DOCS = [
  { name: "产品系列样本（2025版）", meta: "PDF · 2.4MB" },
  { name: "技术参数表", meta: "PDF · 680KB" },
  { name: "选型指南", meta: "PDF · 1.1MB" },
];

const DEFAULT_HISTORY = [
  { date: "2025-05-18\n10:00", title: "询盘：产品选型咨询", status: "已回复" },
  { date: "2025-05-10\n15:20", title: "询盘：材质与规格确认", status: "已回复" },
  { date: "2025-05-02\n09:40", title: "询盘：交货期与价格条款", status: "已回复" },
];

const DEFAULT_FOLLOW_UPS = [
  "具体型号或系列偏好？",
  "是否有图纸或接口定义？",
  "认证要求（UL/CE 等）？",
  "能否提供性能曲线图？",
  "是否有变频控制方案？",
];

function buildFollowUpText(result: SalesAssistantResult): string {
  if (result.missingParameters.length > 0) {
    return `您好，感谢咨询！为了给您更准确的方案，还需要确认以下信息：${result.missingParameters.join("、")}。方便提供后我们尽快为您报价。`;
  }
  return "您好，感谢咨询！我们已收到您的需求，将在 1 个工作日内为您提供详细方案与报价，如有补充请随时告知。";
}

export function SalesAssistantWorkspace() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalesAssistantResult | null>(null);
  const [sheetMarkdown, setSheetMarkdown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>("reply");
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");

  const loadInquiries = useCallback(async () => {
    try {
      const data = await listInquiries({ limit: 50 });
      setInquiries(data);
    } catch {
      setInquiries([]);
    }
  }, []);

  useEffect(() => {
    if (inputMode === "inquiry") {
      void loadInquiries();
    }
  }, [inputMode, loadInquiries]);

  const selectedInquiry = useMemo(
    () => inquiries.find((item) => item.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId],
  );

  useEffect(() => {
    if (!selectedInquiry) return;
    const content = [selectedInquiry.summary, selectedInquiry.customerName]
      .filter(Boolean)
      .join("\n\n");
    setText(content || `客户 ${selectedInquiry.customerName} 的询盘需求`);
  }, [selectedInquiry]);

  const followUpQuestions = useMemo(() => {
    if (result?.missingParameters.length) {
      return result.missingParameters.map((field) => `${field}？`);
    }
    return DEFAULT_FOLLOW_UPS;
  }, [result]);

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeSalesAssistant(text.trim());
      setResult(analysis);
      setActiveTab("reply");
      const sheet = await createRequirementSheet(text.trim());
      setSheetMarkdown(sheet.markdown);
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "分析失败。"));
      setResult(null);
      setSheetMarkdown(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderReplyTab() {
    if (!result) return null;

    const intro = result.suggestedReply.split("\n")[0] ?? result.summary;
    const knownEntries = Object.entries(result.knownParameters);
    const sheetRows = result.requirementSheet.filter((row) => row.value);

    return (
      <>
        <p>{intro}</p>
        <div className={styles.recommendBox}>
          <div className={styles.recommendHead}>
            <Check size={18} color="#22c55e" aria-hidden />
            <span>推荐方案</span>
          </div>
          <div className={styles.recommendTitle}>{result.summary || "基于需求匹配的推荐方案"}</div>
          {knownEntries.length > 0 ? (
            <ul className={styles.specList}>
              {knownEntries.map(([key, value]) => (
                <li key={key} className={styles.specItem}>
                  <span className={styles.specDot} />
                  {key}：{value}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {result.riskNotes.length > 0 ? (
          <>
            <div className={styles.featureTitle}>主要特点</div>
            <ul className={styles.featureList}>
              {result.riskNotes.slice(0, 3).map((note) => (
                <li key={note} className={styles.featureItem}>
                  <Check size={16} className={styles.checkIcon} aria-hidden />
                  {note}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {sheetRows.length > 0 ? (
          <>
            <div className={styles.featureTitle}>主要参数与配置</div>
            <table className={styles.specTable}>
              <tbody>
                {sheetRows.map((row) => (
                  <tr key={row.field}>
                    <td>{row.field}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <div className={styles.recommendBox} style={{ marginTop: 16 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14 }}>
            {result.suggestedReply}
          </pre>
        </div>

        <div className={styles.aiFooter}>
          <span>内容由 Qiyun AI 生成，仅供参考，请结合实际进一步确认。</span>
          <div className={styles.feedbackBtns}>
            <button type="button" className={styles.feedbackBtn} aria-label="有帮助">
              <ThumbsUp size={16} aria-hidden />
            </button>
            <button type="button" className={styles.feedbackBtn} aria-label="无帮助">
              <ThumbsDown size={16} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.feedbackBtn}
              aria-label="复制"
              onClick={() => void handleCopy(result.suggestedReply)}
            >
              <Copy size={16} aria-hidden />
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderTabContent() {
    if (!result) return null;

    if (activeTab === "reply") return renderReplyTab();

    if (activeTab === "missing") {
      return result.missingParameters.length ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {result.missingParameters.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#16a34a" }}>当前需求参数已较完整，可直接进入报价流程。</p>
      );
    }

    if (activeTab === "products") {
      const entries = Object.entries(result.knownParameters);
      return (
        <>
          <p>{result.summary}</p>
          {entries.length > 0 ? (
            <div className={styles.recommendBox}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>已识别参数</div>
              <ul className={styles.specList}>
                {entries.map(([key, value]) => (
                  <li key={key} className={styles.specItem}>
                    <span className={styles.specDot} />
                    {key}：{value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      );
    }

    if (activeTab === "risk") {
      const flags = [
        result.needsDrawing ? "需要图纸确认" : null,
        result.needsEngineer ? "建议工程师介入" : null,
      ].filter(Boolean) as string[];

      return (
        <>
          {result.riskNotes.length > 0 ? (
            <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
              {result.riskNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          {flags.length > 0 ? (
            <div className={styles.recommendBox}>
              {flags.map((flag) => (
                <span key={flag} className={`${styles.tag} ${styles.tagOrange}`} style={{ marginRight: 8 }}>
                  {flag}
                </span>
              ))}
            </div>
          ) : null}
          {!result.riskNotes.length && !flags.length ? (
            <p style={{ color: "#64748b" }}>暂未识别明显风险项。</p>
          ) : null}
          <p style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
            价格、交期、认证、IP 等级、非标技术方案不可由 AI 自行承诺，须人工确认。
          </p>
        </>
      );
    }

    const followUp = buildFollowUpText(result);
    return (
      <>
        <p>基于当前需求生成的跟进话术：</p>
        <div className={styles.recommendBox}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14 }}>
            {followUp}
          </pre>
        </div>
        <div className={styles.aiFooter}>
          <button type="button" className={styles.toolBtn} onClick={() => void handleCopy(followUp)}>
            <Copy size={14} aria-hidden />
            {copied ? "已复制" : "复制话术"}
          </button>
        </div>
      </>
    );
  }

  const customerName = selectedInquiry?.customerName ?? (result ? "咨询客户" : null);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <p>粘贴客户咨询内容，生成专业回复、参数分析与报价前确认单</p>
      </header>

      <div className={styles.banner}>
        <div className={styles.bannerIcon}>
          <Sparkles size={18} aria-hidden />
        </div>
        <div className={styles.bannerText}>
          AI 销售助手已就绪，粘贴客户问题或选择询盘，我将为您生成专业回复与建议
        </div>
        <Link href="/dashboard/inquiries" className={styles.guideLink}>
          <FileText size={14} aria-hidden />
          使用指南
        </Link>
      </div>

      <div className={styles.gridMain}>
        <div className={styles.mainCol}>
          <article className={styles.card}>
            <div className={styles.cardTitle}>
              <span className={styles.stepNumber}>1</span>
              输入客户问题或选择询盘
            </div>

            <div className={styles.inputTabs}>
              <button
                type="button"
                className={inputMode === "paste" ? `${styles.inputTab} ${styles.inputTabActive}` : styles.inputTab}
                onClick={() => setInputMode("paste")}
              >
                粘贴客户问题
              </button>
              <button
                type="button"
                className={inputMode === "inquiry" ? `${styles.inputTab} ${styles.inputTabActive}` : styles.inputTab}
                onClick={() => setInputMode("inquiry")}
              >
                选择已有询盘
              </button>
            </div>

            {inputMode === "inquiry" ? (
              <div className={styles.inquiryPicker}>
                <select
                  className={styles.select}
                  value={selectedInquiryId}
                  onChange={(event) => setSelectedInquiryId(event.target.value)}
                >
                  <option value="">请选择询盘…</option>
                  {inquiries.map((inquiry) => (
                    <option key={inquiry.id} value={inquiry.id}>
                      {inquiry.customerName} · {inquiry.summary?.slice(0, 40) ?? inquiry.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <textarea
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="请输入客户问题或选择询盘…"
              maxLength={2000}
            />
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <button type="button" className={styles.toolBtn} onClick={() => setText("")}>
                  <Trash2 size={14} aria-hidden />
                  清空
                </button>
                <button type="button" className={styles.toolBtn} disabled title="即将上线">
                  <Paperclip size={14} aria-hidden />
                  上传附件
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{text.length} / 2000</span>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => void handleAnalyze()}
                  disabled={loading || !text.trim()}
                >
                  <Sparkles size={14} aria-hidden />
                  {loading ? "分析中…" : "生成建议"}
                </button>
              </div>
            </div>
            {error ? <ConsoleRequestError kind="unknown" message={error} /> : null}
          </article>

          {result ? (
            <article className={styles.card}>
              <div className={styles.cardTitle}>
                <span className={styles.stepNumber}>2</span>
                AI 生成内容
              </div>
              <div className={styles.resultTabs}>
                {RESULT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={activeTab === tab.id ? `${styles.resultTab} ${styles.resultTabActive}` : styles.resultTab}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className={styles.aiContent}>
                <div className={styles.aiAvatar}>
                  <Bot size={20} aria-hidden />
                </div>
                <div className={styles.aiBody}>{renderTabContent()}</div>
              </div>
            </article>
          ) : null}

          {sheetMarkdown ? (
            <article className={styles.card}>
              <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>
                报价前确认单
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#334155" }}>
                {sheetMarkdown}
              </pre>
            </article>
          ) : null}
        </div>

        <aside className={styles.sidebarCol}>
          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <span className={styles.sectionTitle}>关联客户</span>
              {selectedInquiry ? (
                <Link href={`/dashboard/inquiries/${selectedInquiry.id}`} className={styles.link}>
                  查看客户详情
                  <ChevronRight size={14} aria-hidden />
                </Link>
              ) : null}
            </div>

            {customerName ? (
              <>
                <div className={styles.customerRow}>
                  <div className={styles.customerIcon}>
                    <Building2 size={20} aria-hidden />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{customerName}</span>
                      <span className={`${styles.tag} ${styles.tagBlue}`}>高意向客户</span>
                    </div>
                    <div className={styles.customerMeta}>
                      <div>
                        客户来源：<span className="value">{selectedInquiry ? "官网询盘" : "直接咨询"}</span>
                      </div>
                      <div>
                        所属销售：<span className="value">—</span>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        联系邮箱：<span className="value">{selectedInquiry?.customerContact ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.statGrid}>
                  <div>
                    <div className={styles.statValue}>{selectedInquiry ? "12" : "—"}</div>
                    <div className={styles.statLabel}>历史询盘</div>
                  </div>
                  <div>
                    <div className={styles.statValueBlue}>高意向</div>
                    <div className={styles.statLabel}>客户等级</div>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptyHint}>生成建议或选择询盘后将显示客户信息</p>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <span className={styles.sectionTitle}>历史会话摘要</span>
              <Link href="/dashboard/inquiries" className={styles.link}>
                查看全部
                <ChevronRight size={14} aria-hidden />
              </Link>
            </div>
            {result || selectedInquiry ? (
              DEFAULT_HISTORY.map((item) => (
                <div key={item.title} className={styles.historyItem}>
                  <div className={styles.historyTime}>
                    {item.date.split("\n").map((line) => (
                      <span key={line} style={{ display: "block" }}>
                        {line}
                      </span>
                    ))}
                  </div>
                  <div>
                    <div className={styles.historyTitle}>{item.title}</div>
                    <div className={styles.historyStatus}>{item.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.emptyHint}>暂无关联会话</p>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <span className={styles.sectionTitle}>产品资料引用</span>
              {result ? <span style={{ fontSize: 12, color: "#64748b" }}>已匹配 3 份</span> : null}
            </div>
            {result ? (
              <>
                {DEFAULT_DOCS.map((doc) => (
                  <div key={doc.name} className={styles.docItem} style={{ marginBottom: 12 }}>
                    <div className={styles.docIcon}>
                      <FileText size={16} aria-hidden />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.docName}>{doc.name}</div>
                      <div className={styles.docMeta}>{doc.meta}</div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/knowledge-bases" className={styles.link}>
                  查看全部
                  <ChevronRight size={14} aria-hidden />
                </Link>
              </>
            ) : (
              <p className={styles.emptyHint}>分析后将推荐相关产品文档</p>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <span className={styles.sectionTitle}>常见追问</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>AI 推荐</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {followUpQuestions.slice(0, 5).map((question) => (
                <button
                  key={question}
                  type="button"
                  className={styles.suggestItem}
                  onClick={() => setText((current) => (current ? `${current}\n${question}` : question))}
                >
                  {question}
                  <ChevronRight size={16} color="#94a3b8" aria-hidden />
                </button>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.sectionTitle} style={{ marginBottom: 16 }}>
              快捷操作
            </div>
            <div className={styles.quickGrid}>
              <button
                type="button"
                className={styles.quickAction}
                disabled={!result}
                onClick={() => result && void handleCopy(result.suggestedReply)}
              >
                <Copy size={22} color="#2563eb" aria-hidden />
                复制回复
              </button>
              <button type="button" className={styles.quickAction} title="即将上线" disabled={!result}>
                <Mail size={22} color="#2563eb" aria-hidden />
                发送到邮件
              </button>
              <button
                type="button"
                className={styles.quickAction}
                disabled={!selectedInquiry}
                onClick={() => selectedInquiry && router.push(`/dashboard/inquiries/${selectedInquiry.id}`)}
              >
                <FileText size={22} color="#16a34a" aria-hidden />
                转为报价
              </button>
              <button type="button" className={styles.quickAction} disabled title="即将上线">
                <UserPlus size={22} color="#7c3aed" aria-hidden />
                加入跟进
              </button>
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
