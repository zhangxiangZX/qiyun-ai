"use client";

import { unwrapEnvelope } from "@/lib/api/envelope";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudUpload,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  List,
  Lock,
  MessageCircle,
  Paperclip,
  Phone,
  Ruler,
  Send,
  Server,
  Snowflake,
  Sparkles,
  TreePine,
  User,
  Wand2,
  X,
} from "lucide-react";

import {
  getDefaultSelectionPageConfig,
  getSelectionPageStorageKey,
  mergeSelectionPageConfig,
  type DemoChatMessage,
  type SelectionPagePublicConfig,
} from "@/lib/channels/ai-selection-page-config";
import { streamChatMessage } from "@/lib/chat/api";
import {
  formatAcquisitionSourceLabel,
  resolveAcquisitionSource,
} from "@/lib/public/acquisition-source";
import { useVisualViewportBottomInset } from "@/lib/public/use-visual-viewport-bottom-inset";
import styles from "@/styles/ai-selection-public.module.css";

interface ChatMessage extends DemoChatMessage {}

function BotIllustration() {
  return (
    <svg viewBox="0 0 120 120" className={styles.botArt} aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#ffffff" stroke="#dbeafe" strokeWidth="2" />
      <rect x="38" y="24" width="44" height="36" rx="10" fill="#2563eb" />
      <circle cx="50" cy="40" r="5" fill="#ffffff" />
      <circle cx="70" cy="40" r="5" fill="#ffffff" />
      <circle cx="50" cy="40" r="2.5" fill="#1e40af" />
      <circle cx="70" cy="40" r="2.5" fill="#1e40af" />
      <rect x="52" y="52" width="16" height="6" rx="3" fill="#60a5fa" />
      <rect x="44" y="62" width="32" height="4" rx="2" fill="#93c5fd" />
      <rect x="50" y="96" width="20" height="12" rx="4" fill="#2563eb" />
      <circle cx="60" cy="84" r="18" fill="#e0f2fe" />
      <rect x="52" y="78" width="16" height="12" rx="4" fill="#ffffff" />
      <circle cx="56" cy="82" r="1.5" fill="#2563eb" />
      <circle cx="64" cy="82" r="1.5" fill="#2563eb" />
      <path d="M34 90 Q60 110 86 90" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      <rect x="30" y="76" width="10" height="22" rx="5" fill="#ffffff" stroke="#dbeafe" strokeWidth="1.5" />
      <rect x="80" y="76" width="10" height="22" rx="5" fill="#ffffff" stroke="#dbeafe" strokeWidth="1.5" />
      <circle cx="60" cy="22" r="4" fill="#60a5fa" />
    </svg>
  );
}

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  outdoor: <Building2 size={14} color="#2563eb" />,
  stainless: <Layers size={14} color="#2563eb" />,
  control: <Server size={14} color="#2563eb" />,
  ac: <Snowflake size={14} color="#2563eb" />,
  custom: <Wand2 size={14} color="#2563eb" />,
};

const WELCOME_CHIP_ICONS = [
  <GraduationCap key="g" size={10} color="#2563eb" />,
  <List key="l" size={10} color="#2563eb" />,
  <Sparkles key="s" size={10} color="#2563eb" />,
];

const PRODUCT_FOLLOWUP: Record<string, string[]> = {
  outdoor: [
    "户外机柜的防护等级要求（IP55 / IP65）？",
    "机柜尺寸（宽×深×高 mm）是多少？",
    "是否需要散热或温控设计？",
    "预计采购数量？",
  ],
  stainless: [
    "不锈钢机柜的材质要求（304 / 316）？",
    "用于室内还是腐蚀性环境？",
    "需要的尺寸范围？",
    "是否需要密封或防水处理？",
  ],
  control: [
    "控制柜的安装方式（壁挂 / 落地）？",
    "需要集成哪些电气元件？",
    "防护等级要求？",
    "预计采购数量？",
  ],
  ac: [
    "机柜空调的制冷量需求（W）？",
    "适配机柜的尺寸？",
    "使用环境的温度范围？",
    "是否需要温控或通信接口？",
  ],
  custom: [
    "是否有图纸或参考图片？",
    "核心尺寸与材质要求？",
    "功能或工艺上的特殊需求？",
    "预计交付时间？",
  ],
};

async function loadConfig(slug: string, preview: boolean): Promise<SelectionPagePublicConfig | null> {
  const defaults = getDefaultSelectionPageConfig(slug);
  let local: SelectionPagePublicConfig | null = defaults;

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(getSelectionPageStorageKey(slug));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SelectionPagePublicConfig;
        local = defaults ? mergeSelectionPageConfig(defaults, parsed) : parsed;
      } catch {
        local = defaults;
      }
    }
  }

  // Preview of local drafts (including newly created pages without demo defaults).
  if (preview && local?.slug) return local;

  try {
    const response = await fetch(`/api/selection-pages/public/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (response.ok) {
      return unwrapEnvelope<SelectionPagePublicConfig>(await response.json());
    }
    if (response.status === 403 || response.status === 404) {
      return preview && local?.slug ? local : null;
    }
  } catch {
    if (local?.published && local.enabled) return local;
    return preview && local?.slug ? local : null;
  }

  if (local?.published && local.enabled) return local;
  return preview && local?.slug ? local : null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function AiSelectionPublicPage({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const sourceQuery = useMemo(() => resolveAcquisitionSource(searchParams), [searchParams]);
  const keyboardInset = useVisualViewportBottomInset();
  const [config, setConfig] = useState<SelectionPagePublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [botThinking, setBotThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { id: string; name: string; size: string; attachmentId?: string; uploading?: boolean; error?: string }[]
  >([]);
  const [uploadBanner, setUploadBanner] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [leadHint, setLeadHint] = useState<string | null>(null);

  const chatListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completenessRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void loadConfig(slug, preview).then((next) => {
      if (!active) return;
      if (!next) {
        setError("选型页不存在或未发布。");
      } else if (!preview && (!next.enabled || !next.published)) {
        setError("选型页暂未开放访问。");
      } else {
        setConfig(next);
        setActiveProduct(next.defaultProduct);
        setMessages(next.demoMessages);
        setUploadedFiles(
          next.upload.sampleFileName
            ? [{ id: "sample", name: next.upload.sampleFileName, size: next.upload.sampleFileSize }]
            : [],
        );
        const initial: Record<string, string> = {};
        next.form.fields.forEach((field) => {
          // Only prefill demo contacts in preview mode — never on real visitor pages.
          if (preview && field.id === "name") initial[field.id] = "张先生";
          else if (preview && field.id === "phone") initial[field.id] = "138 8888 8888";
          else initial[field.id] = "";
        });
        setFormValues(initial);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug, preview]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, botThinking]);

  function appendBot(
    content: string,
    followUpList?: string[],
    extras?: { citations?: ChatMessage["citations"]; needsLeadCapture?: boolean },
  ) {
    const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((current) => [
      ...current,
      {
        id,
        role: "assistant",
        content,
        followUpList,
        citations: extras?.citations,
        needsLeadCapture: extras?.needsLeadCapture,
      },
    ]);
  }

  function getVisitorId() {
    if (typeof window === "undefined") return `v_selection_${slug}`;
    const key = `qy_selection_visitor_${slug}`;
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `v_${crypto.randomUUID()}`
        : `v_${Date.now().toString(36)}`;
    window.localStorage.setItem(key, next);
    return next;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || botThinking) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((current) => [...current, userMsg]);
    setInput("");
    setBotThinking(true);
    setLeadHint(null);

    const botId = config?.botId?.trim();
    const siteKey = config?.siteKey?.trim();

    if (botId && siteKey) {
      try {
        const result = await streamChatMessage({
          botId,
          siteKey,
          visitorId: getVisitorId(),
          conversationId,
          message: text,
          origin: window.location.origin,
        });
        if (result.conversationId) setConversationId(result.conversationId);
        appendBot(result.content, undefined, {
          citations: result.citations.map((item) => ({
            title: item.title,
            snippet: item.snippet,
          })),
          needsLeadCapture: result.needsLeadCapture,
        });
        if (result.needsLeadCapture) {
          setLeadHint("该问题涉及报价/交期等关键信息，建议留下联系方式，工程师将尽快跟进。");
          (formSectionRef.current ?? completenessRef.current)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      } catch (error) {
        appendBot(
          error instanceof Error
            ? `暂时无法完成智能回答：${error.message}`
            : "暂时无法完成智能回答，请稍后重试，或直接提交需求由工程师联系您。",
        );
      } finally {
        setBotThinking(false);
      }
      return;
    }

    // Fallback demo reply when bot/site not bound (local draft without RAG).
    window.setTimeout(() => {
      const productHint = activeProduct ? `关于「${activeProduct}」，` : "";
      appendBot(
        `${productHint}当前页面尚未绑定可用的 AI 助手与站点密钥，暂无法检索企业知识库。请在选型页编辑中绑定助手并保存后重试；或直接填写下方表单提交需求。`,
      );
      setBotThinking(false);
    }, 400);
  }

  function handleProductClick(label: string, id: string) {
    if (activeProduct === label) return;
    setActiveProduct(label);
    const followUp = PRODUCT_FOLLOWUP[id] ?? [
      "核心尺寸与材质要求？",
      "使用环境？",
      "预计采购数量？",
      "是否有图纸或参考图片？",
    ];
    window.setTimeout(() => {
      appendBot(`您正在咨询「${label}」，我帮您梳理几个关键参数：`, followUp);
    }, 300);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const botId = config?.botId?.trim();
    const siteKey = config?.siteKey?.trim();
    setUploadBanner(null);

    for (const [index, file] of files.entries()) {
      const localId = `f-${Date.now()}-${index}`;
      setUploadedFiles((current) => [
        ...current,
        {
          id: localId,
          name: file.name,
          size: formatFileSize(file.size),
          uploading: true,
        },
      ]);

      if (!botId || !siteKey) {
        const message =
          "当前页面未绑定助手，无法上传附件。请联系管理员完成绑定后重试，或直接提交表单（仅记录文件名无效）。";
        setUploadedFiles((current) =>
          current.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  uploading: false,
                  error: message,
                }
              : item,
          ),
        );
        setUploadBanner(message);
        continue;
      }

      try {
        const form = new FormData();
        form.append("file", file);
        form.append("botId", botId);
        form.append("siteKey", siteKey);
        if (conversationId) form.append("conversationId", conversationId);
        const response = await fetch("/api/public/leads/attachments", {
          method: "POST",
          body: form,
          cache: "no-store",
        });
        if (!response.ok) {
          let message = `「${file.name}」上传失败（${response.status}）`;
          try {
            const payload = (await response.json()) as { message?: string; code?: string };
            if (payload.message) message = `「${file.name}」${payload.message}`;
            else if (payload.code) message = `「${file.name}」上传失败：${payload.code}`;
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }
        const payload = unwrapEnvelope<{ id?: string; fileName?: string }>(await response.json());
        setUploadedFiles((current) =>
          current.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  uploading: false,
                  attachmentId: payload?.id,
                  name: payload?.fileName || file.name,
                  error: undefined,
                }
              : item,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `「${file.name}」上传失败，请检查网络后重试`;
        setUploadedFiles((current) =>
          current.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  uploading: false,
                  error: message,
                }
              : item,
          ),
        );
        setUploadBanner(message);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(id: string) {
    setUploadedFiles((current) => {
      const next = current.filter((f) => f.id !== id);
      if (!next.some((f) => f.error)) setUploadBanner(null);
      return next;
    });
  }

  function handleSubmit() {
    if (submitting || submitted) return;
    const name = formValues["name"]?.trim();
    const phone = formValues["phone"]?.trim();
    if (!name || !phone) {
      setFormError("请填写联系人和手机号，方便工程师与您联系");
      (formSectionRef.current ?? completenessRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFormError(null);

    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(formValues)) {
      if (key === "name" || key === "phone" || key === "email") continue;
      const trimmed = value?.trim();
      if (trimmed) answers[key] = trimmed;
    }
    if (activeProduct) answers.product = activeProduct;
    const source = sourceQuery || config?.sourceId || undefined;
    if (source) answers.source = source;
    if (messages.length) {
      answers.message = messages
        .map((m) => `${m.role === "user" ? "客户" : "助手"}：${m.content}`)
        .join("\n");
    }
    if (uploadedFiles.length) {
      answers.files = uploadedFiles.map((f) => f.name).join(", ");
      const attachmentIds = uploadedFiles.map((f) => f.attachmentId).filter(Boolean);
      if (attachmentIds.length) {
        answers.attachmentIds = attachmentIds.join(",");
      }
    }

    const failedUploads = uploadedFiles.filter((f) => f.error);
    if (failedUploads.length) {
      setFormError("存在上传失败的附件，请删除失败文件后重试，或移除后再提交。");
      (formSectionRef.current ?? completenessRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    const payload = {
      contactName: name,
      contactPhone: phone,
      contactEmail: formValues["email"]?.trim() || undefined,
      answers,
      attachmentIds: uploadedFiles.map((f) => f.attachmentId).filter(Boolean) as string[],
      // Keep legacy aliases for older BFF / offline tooling
      name,
      phone,
      source,
      product: activeProduct,
      message: answers.message,
      files: uploadedFiles.map((f) => f.name),
    };

    void (async () => {
      setSubmitting(true);
      try {
        const response = await fetch(`/api/selection-pages/public/${encodeURIComponent(slug)}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setSubmitted(true);
          const params = new URLSearchParams();
          if (source) params.set("source", source);
          params.set("title", config?.postSubmit.successTitle || "提交成功！");
          params.set("message", config?.postSubmit.successMessage || "感谢您的提交，我们会尽快与您联系");
          // Soft navigate after short success overlay so WeChat users land on cookie-free page.
          window.setTimeout(() => {
            window.location.assign(`/success?${params.toString()}`);
          }, 1200);
          return;
        }
        // Preview / unpublished local demos: still show success UI when upstream has no page.
        if (preview && (response.status === 404 || response.status === 403)) {
          setSubmitted(true);
          return;
        }
        let detail = "提交失败，请稍后重试";
        try {
          const body = (await response.json()) as { message?: string; errorCode?: string; code?: string };
          if (body?.message) detail = body.message;
          else if (body?.errorCode || body?.code) detail = `提交失败（${body.errorCode ?? body.code}）`;
        } catch {
          /* ignore parse errors */
        }
        setFormError(detail);
        (formSectionRef.current ?? completenessRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        if (preview) {
          setSubmitted(true);
          return;
        }
        setFormError("网络异常，提交失败，请稍后重试");
      } finally {
        setSubmitting(false);
      }
    })();
  }

  if (loading) {
    return <div className={styles.stateBox}>正在加载选型页…</div>;
  }

  if (error || !config) {
    return <div className={styles.stateBox}>{error ?? "页面不可用"}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <button type="button" className={styles.headerBtn} aria-label="返回" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ChevronLeft size={20} />
          </button>
          <div className={styles.headerCenter}>
            <div className={styles.brandIcon}>{config.header.brandLetter}</div>
            <div>
              <div className={styles.headerTitle}>{config.header.title}</div>
              <div className={styles.headerSub}>{config.header.subtitle}</div>
            </div>
          </div>
          <button type="button" className={styles.headerBtn} aria-label="回到顶部" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ExternalLink size={18} />
          </button>
        </header>

        <main
          className={styles.main}
          style={{
            paddingBottom: `calc(184px + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
          }}
        >
          <section className={styles.welcomeCard}>
            <BotIllustration />
            <div>
              <div className={styles.welcomeTitle}>
                {config.welcome.title}
                <span className={styles.highlight}>{config.welcome.highlight}</span>。
              </div>
              <div className={styles.chips}>
                {config.welcome.chips.map((chip, index) => (
                  <span key={chip} className={styles.chip}>
                    {WELCOME_CHIP_ICONS[index] ?? <Sparkles size={10} color="#2563eb" />}
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className={styles.productRow}>
            {config.productChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={
                  activeProduct === chip.label ? styles.productChipActive : styles.productChip
                }
                aria-pressed={activeProduct === chip.label}
                onClick={() => handleProductClick(chip.label, chip.id)}
              >
                {PRODUCT_ICONS[chip.id] ?? <Building2 size={14} color="#2563eb" />}
                {chip.label}
              </button>
            ))}
          </div>

          <div className={styles.chatList} ref={chatListRef} aria-live="polite">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className={styles.msgRowUser}>
                  <div className={styles.bubbleUser}>{message.content}</div>
                  <div className={styles.avatarUser}>
                    <User size={14} />
                  </div>
                </div>
              ) : (
                <div key={message.id} className={styles.msgRowBot}>
                  <div className={styles.avatarBot}>
                    <Bot size={14} />
                  </div>
                  <div className={styles.bubbleBot}>
                    {message.content}
                    {message.followUpList ? (
                      <ol className={styles.followList}>
                        {message.followUpList.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    ) : null}
                    {message.citations && message.citations.length > 0 ? (
                      <div className={styles.citations}>
                        <div className={styles.citationsTitle}>参考来源</div>
                        <ul className={styles.citationsList}>
                          {message.citations.slice(0, 3).map((item) => (
                            <li key={`${message.id}-${item.title}`}>
                              <strong>{item.title}</strong>
                              {item.snippet ? <span>{item.snippet}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {message.needsLeadCapture ? (
                      <p className={styles.leadCaptureHint}>涉及报价/交期等，建议提交下方联系方式。</p>
                    ) : null}
                  </div>
                </div>
              ),
            )}
            {botThinking ? (
              <div className={styles.msgRowBot}>
                <div className={styles.avatarBot}>
                  <Bot size={14} />
                </div>
                <div className={styles.bubbleBot}>
                  <span className={styles.typing}>
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {config.completeness.items.length > 0 ? (
          <section className={styles.card} ref={completenessRef}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>
                <span>需求完整度</span>
                <span className={styles.percent}>{config.completeness.percent}%</span>
              </div>
              <button type="button" className={styles.detailLink} onClick={() => completenessRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                查看详情 <ChevronRight size={12} />
              </button>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${config.completeness.percent}%` }}
              />
            </div>
            <div className={styles.grid3}>
              {config.completeness.items.map((item) => (
                <div key={item.id} className={styles.gridItem}>
                  <div className={styles.gridIcon}>
                    {item.id === "product" ? <Building2 size={14} /> : null}
                    {item.id === "size" ? <Ruler size={14} /> : null}
                    {item.id === "env" ? <TreePine size={14} /> : null}
                    {item.id === "qty" ? <Layers size={14} /> : null}
                    {item.id === "file" ? <Paperclip size={14} /> : null}
                    {item.id === "lead" ? <Clock size={14} /> : null}
                  </div>
                  <div>
                    <div className={styles.gridLabel}>{item.label}</div>
                    <div className={item.done ? styles.gridValue : styles.gridValuePending}>
                      {item.value}
                    </div>
                  </div>
                  {item.done ? (
                    <CheckCircle2 size={14} className={styles.checkIcon} />
                  ) : (
                    <span className={styles.pendingRing} />
                  )}
                </div>
              ))}
            </div>
          </section>
          ) : null}

          <section className={styles.card}>
            <div className={styles.uploadHead}>
              <div className={styles.uploadTitle}>
                <CloudUpload size={18} color="#2563eb" />
                <span>{config.upload.title}</span>
                <span className={styles.uploadHint}>{config.upload.hint}</span>
              </div>
              <button type="button" className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                {config.upload.buttonLabel}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.cad,.dwg,.jpg,.jpeg,.png"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
              />
            </div>
            {uploadBanner ? <div className={styles.uploadErrorBanner} role="alert">{uploadBanner}</div> : null}
            {uploadedFiles.length ? (
              <div className={styles.fileList}>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={file.error ? `${styles.fileRow} ${styles.fileRowError}` : styles.fileRow}
                  >
                    <div className={styles.fileIcon}>
                      <FileText size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={file.error ? styles.fileError : styles.fileSize}>
                        {file.uploading ? "上传中…" : file.error ? file.error : file.size}
                      </div>
                    </div>
                    {file.uploading ? null : file.error ? null : <CheckCircle2 size={16} color="#22c55e" />}
                    <button type="button" className={styles.headerBtn} aria-label={`删除 ${file.name}`} onClick={() => removeFile(file.id)}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className={styles.card} ref={formSectionRef}>
            {leadHint ? <p className={styles.leadBanner}>{leadHint}</p> : null}
            <div className={styles.formGrid}>
              {config.form.fields.map((field) => (
                <div
                  key={field.id}
                  className={field.span === 2 ? styles.fieldFull : styles.field}
                >
                  <label>
                    {field.label} {field.required ? <span className={styles.required}>*</span> : null}
                  </label>
                  <div className={styles.inputWrap}>
                    {field.type === "tel" ? (
                      <Phone size={12} className={styles.inputIcon} />
                    ) : (
                      <User size={12} className={styles.inputIcon} />
                    )}
                    <input
                      type={field.type === "tel" ? "tel" : "text"}
                      placeholder={field.placeholder}
                      value={formValues[field.id] ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            {formError ? <div className={styles.formError}>{formError}</div> : null}
            <div className={styles.privacy}>
              <Lock size={12} />
              <span>{config.form.privacyNote}</span>
            </div>
          </section>

          {sourceQuery ? (
            <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "center" }}>
              来源标识：{formatAcquisitionSourceLabel(sourceQuery) || sourceQuery}
            </p>
          ) : null}
        </main>

        <div
          className={styles.footer}
          style={{
            bottom: keyboardInset,
            paddingBottom: `calc(10px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <input
              className={styles.composerInput}
              placeholder="输入您的需求或问题…"
              aria-label="输入消息"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className={styles.composerSend} aria-label="发送" disabled={!input.trim() || botThinking}>
              <Send size={16} />
            </button>
          </form>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={submitting || submitted}
            >
              <Send size={16} />
              <div className={styles.btnPrimaryText}>
                <div>{submitting ? "提交中…" : config.footer.submitLabel}</div>
                <div className={styles.btnPrimarySub}>{config.footer.submitSub}</div>
              </div>
            </button>
          </div>
        </div>

        {submitted ? (
          <div className={styles.successOverlay}>
            <div className={styles.successCard}>
              <CheckCircle2 size={40} color="#22c55e" />
              <h2>{config.postSubmit.successTitle}</h2>
              <p>{config.postSubmit.successMessage}</p>
              <button type="button" className={styles.successBtn} onClick={() => setSubmitted(false)}>
                知道了
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
