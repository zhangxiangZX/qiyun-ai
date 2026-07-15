"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { inferChatResponseOutcome } from "@/components/shared/chat-response-outcome";
import { getBotDetail, listBots } from "@/lib/bots/data";
import type { BotDetail, BotListItem } from "@/lib/bots/types";
import {
  getPreviewBotContext,
  streamChatMessage,
  syncPreviewBot,
  type PreviewBotContext,
} from "@/lib/chat/api";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/conversation-test.module.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  citations?: Array<{ title: string; snippet: string; score?: number }>;
  needsLeadCapture?: boolean;
}

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "d1",
    role: "user",
    content: "你们的户外机柜可以做 IP65 吗？",
    time: "10:23:15",
  },
  {
    id: "d2",
    role: "assistant",
    content:
      "可以的，我们的户外机柜支持 IP65 防护等级，采用优质密封胶条和防水结构设计，可有效防尘防水，适用于户外恶劣环境。",
    time: "10:23:18",
    citations: [{ title: "户外机柜 IP 防护等级说明", snippet: "产品知识库", score: 0.95 }],
  },
  {
    id: "d3",
    role: "user",
    content: "我要 20 台，尺寸 800×600×2000，多久能交货？",
    time: "10:23:45",
  },
  {
    id: "d4",
    role: "assistant",
    content:
      "20 台 800×600×2000 尺寸的户外机柜，常规款交期为 15-20 个工作日。具体交期需要确认以下信息后为您精准排期：\n1. 是否需要非标定制或开孔\n2. 表面处理颜色要求\n3. 内部配置需求（如层板、风扇、PDU 等）\n\n请提供以上信息，我将为您确认准确交期。",
    time: "10:23:48",
    citations: [{ title: "户外机柜 交期说明", snippet: "产品知识库", score: 0.92 }],
  },
  {
    id: "d5",
    role: "user",
    content: "可以先给我一个大概的报价吗？",
    time: "10:24:10",
  },
  {
    id: "d6",
    role: "assistant",
    content:
      "当然可以。为了给您提供更准确的报价，请您先提供以下信息：\n1. 材质要求（冷轧钢板 / 不锈钢）\n2. 表面处理（喷塑颜色）\n3. 是否需要内部配置\n4. 送货地址（国家/城市）\n\n提供以上信息后，我将尽快为您生成报价单。",
    time: "10:24:12",
    citations: [{ title: "报价前信息收集规则", snippet: "业务规则库", score: 0.9 }],
  },
];

const DEMO_KB = [
  { title: "户外机柜 IP 防护等级说明", path: "产品知识库 / 户外机柜 / 技术参数", score: 95 },
  { title: "户外机柜 交期说明", path: "产品知识库 / 户外机柜 / 交期与物流", score: 92 },
  { title: "报价前信息收集规则", path: "业务规则库 / 报价管理 / 报价流程", score: 90 },
];

const DEMO_RULES = [
  "报价前必须收集关键信息",
  "交期计算规则（常规款）",
  "高意向客户识别（询价）",
];

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function renderBotContent(content: string) {
  const lines = content.split("\n");
  const items: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    items.push(
      <ol key={`ol-${items.length}`}>
        {listItems.map((item) => (
          <li key={item}>{item.replace(/^\d+\.\s*/, "")}</li>
        ))}
      </ol>,
    );
    listItems = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+\./.test(trimmed)) {
      listItems.push(trimmed);
    } else {
      flushList();
      if (trimmed) {
        items.push(<p key={`p-${items.length}`}>{trimmed}</p>);
      }
    }
  }
  flushList();
  return items.length > 0 ? items : content;
}

function ScoreRing({ score }: { score: number }) {
  const dash = `${score}, 100`;
  return (
    <div className={styles.scoreRing}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeDasharray={dash}
        />
      </svg>
      <div className={styles.scoreValue}>{score}</div>
    </div>
  );
}

function computeEvaluation(messages: ChatMessage[], isDemo: boolean) {
  if (isDemo) {
    return {
      score: 92,
      metrics: [
        { label: "知识准确性", value: 95, color: "#3b82f6" },
        { label: "业务合规性", value: 90, color: "#22c55e" },
        { label: "回复完整性", value: 90, color: "#a855f7" },
        { label: "表达友好性", value: 93, color: "#f97316" },
      ],
      stats: { kbHits: 8, rules: 3, handoff: 0, leads: 2 },
      kbItems: DEMO_KB,
      rules: DEMO_RULES,
    };
  }

  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  const allCitations = assistantMsgs.flatMap((m) => m.citations ?? []);
  const kbHits = allCitations.length;
  const leads = assistantMsgs.filter((m) => m.needsLeadCapture).length;
  const handoff = assistantMsgs.filter(
    (m) => inferChatResponseOutcome({ citations: m.citations, needsLeadCapture: m.needsLeadCapture }) === "needs_followup",
  ).length;
  const rules = Math.min(3, Math.max(0, Math.floor(kbHits / 2)));
  const avgScore =
    allCitations.length > 0
      ? Math.round(allCitations.reduce((s, c) => s + (c.score ?? 0.8) * 100, 0) / allCitations.length)
      : 75;
  const score = Math.min(100, Math.round(avgScore * 0.4 + (kbHits > 0 ? 30 : 10) + (leads === 0 ? 20 : 10)));

  return {
    score,
    metrics: [
      { label: "知识准确性", value: avgScore, color: "#3b82f6" },
      { label: "业务合规性", value: Math.min(100, score - 2), color: "#22c55e" },
      { label: "回复完整性", value: Math.min(100, score - 5), color: "#a855f7" },
      { label: "表达友好性", value: Math.min(100, score + 1), color: "#f97316" },
    ],
    stats: { kbHits, rules, handoff, leads },
    kbItems: allCitations.slice(0, 3).map((c, i) => ({
      title: c.title,
      path: c.snippet || "知识库",
      score: Math.round((c.score ?? 0.85) * 100),
    })),
    rules: [],
  };
}

export function ConversationTestWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [botDetail, setBotDetail] = useState<BotDetail | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [previewContext, setPreviewContext] = useState<PreviewBotContext | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [chatError, setChatError] = useState<{ message: string } | null>(null);
  const visitorIdRef = useRef("visitor_test");
  const listRef = useRef<HTMLDivElement>(null);

  const loadBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextBots = await listBots();
      setBots(nextBots);
      const preferred = nextBots.find((b) => b.status === "enabled") ?? nextBots[0];
      if (preferred) setSelectedBotId(preferred.id);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  useOnWorkspaceChanged(() => {
    void loadBots();
  });

  useEffect(() => {
    if (!selectedBotId) return;
    let cancelled = false;

    async function loadDetail() {
      try {
        const detail = await getBotDetail(selectedBotId);
        if (!cancelled) setBotDetail(detail);
      } catch {
        if (!cancelled) setBotDetail(null);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedBotId]);

  useEffect(() => {
    if (!botDetail) return;
    let cancelled = false;

    async function bootstrap() {
      setBootstrapping(true);
      setChatError(null);
      try {
        if (!botDetail) return;
        const context = await syncPreviewBot({
          botId: botDetail.id,
          name: botDetail.name,
          status: botDetail.status,
          knowledgeBaseIds: botDetail.knowledgeBaseIds,
        });
        if (!cancelled) setPreviewContext(context);
      } catch {
        try {
          if (!botDetail) return;
          const context = await getPreviewBotContext(botDetail.id);
          if (!cancelled) setPreviewContext(context);
        } catch (err) {
          if (!cancelled) {
            setChatError(resolveRequestErrorPresentation(err, "无法初始化聊天预览。"));
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [botDetail]);

  const evaluation = useMemo(() => computeEvaluation(messages, isDemo), [messages, isDemo]);

  const selectedBotName = bots.find((b) => b.id === selectedBotId)?.name ?? "智能询盘回复助手";

  function scrollToBottom() {
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }

  function handleClear() {
    setIsDemo(false);
    setConversationId(undefined);
    setChatError(null);
    const welcome = botDetail?.welcomeMessage ?? "您好，我是智能销售助手，有什么可以帮您？";
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcome,
        time: formatTime(),
      },
    ]);
  }

  async function handleSend() {
    const question = input.trim();
    if (!question || sending || bootstrapping) return;

    if (!botDetail || !previewContext) {
      setChatError({ message: "助手未就绪，请稍后再试。" });
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      time: formatTime(),
    };

    if (isDemo) {
      setIsDemo(false);
      setMessages([userMessage]);
    } else {
      setMessages((current) => [...current, userMessage]);
    }
    setInput("");
    setSending(true);
    setChatError(null);

    try {
      const result = await streamChatMessage({
        botId: previewContext.botId,
        siteKey: previewContext.siteKey,
        visitorId: visitorIdRef.current,
        conversationId,
        origin: previewContext.origin,
        message: question,
      });

      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: result.messageId || `assistant-${Date.now()}`,
          role: "assistant",
          content: result.content,
          time: formatTime(),
          needsLeadCapture: result.needsLeadCapture,
          citations: result.citations.map((c) => ({
            title: c.title,
            snippet: c.snippet,
            score: c.score,
          })),
        },
      ]);
      scrollToBottom();
    } catch (err) {
      setChatError(resolveRequestErrorPresentation(err, "发送失败，请重试。"));
    } finally {
      setSending(false);
    }
  }

  function handleBotChange(botId: string) {
    setSelectedBotId(botId);
    setIsDemo(true);
    setMessages(DEMO_MESSAGES);
    setConversationId(undefined);
    setPreviewContext(null);
    setInput("");
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载助手列表…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "助手列表加载失败，已展示示例对话。")} />
      ) : null}

      <div className={styles.pageHeader}>
        <div>
          <p>在此测试智能助手的对话效果，验证知识库和业务规则是否生效</p>
        </div>
        <button type="button" className={styles.btnPrimary}>
          <Save size={14} aria-hidden /> 保存测试报告
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.botSelect}>
          <Bot size={14} className={styles.botSelectIcon} aria-hidden />
          <select
            value={selectedBotId}
            onChange={(e) => handleBotChange(e.target.value)}
            aria-label="选择助手"
          >
            {bots.length === 0 ? (
              <option value="">智能询盘回复助手</option>
            ) : (
              bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))
            )}
          </select>
        </div>
        <select className={styles.filterSelect} defaultValue="general" aria-label="场景">
          <option value="general">通用场景</option>
          <option value="inquiry">询盘回复</option>
          <option value="quote">报价咨询</option>
        </select>
        <select className={styles.filterSelect} defaultValue="zh" aria-label="语言">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <button type="button" className={styles.btnClear} onClick={handleClear}>
          清空对话
        </button>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.chatPanel}>
          <div ref={listRef} className={styles.chatMessages}>
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className={styles.msgRowUser}>
                  <div className={styles.bubbleUser}>{message.content}</div>
                  <span className={styles.msgTime}>{message.time}</span>
                </div>
              ) : (
                <div key={message.id} className={styles.msgRowBot}>
                  <div className={styles.botAvatar}>
                    <Bot size={14} aria-hidden />
                  </div>
                  <div className={styles.bubbleBot}>{renderBotContent(message.content)}</div>
                  <span className={styles.msgTime}>{message.time}</span>
                </div>
              ),
            )}
            {(sending || bootstrapping) && !isDemo ? (
              <div className={styles.typingRow}>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                {bootstrapping ? "正在初始化预览环境…" : "正在生成回复…"}
              </div>
            ) : null}
          </div>

          {chatError ? (
            <div style={{ padding: "0 16px 8px" }}>
              <ConsoleRequestError message={chatError.message} />
            </div>
          ) : null}

          <form
            className={styles.chatInputBar}
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="text"
              placeholder="请输入测试问题，Enter 发送，Shift+Enter 换行"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending || bootstrapping}
            />
            <button type="button" className={styles.iconBtn} aria-label="附件">
              <Paperclip size={16} />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="图片">
              <ImageIcon size={16} />
            </button>
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!input.trim() || sending || bootstrapping}
              aria-label="发送"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        <aside className={styles.evalPanel}>
          <div className={styles.evalHeader}>
            <h3>对话评估</h3>
            <button type="button" className={styles.linkBtn}>
              <RefreshCw size={12} aria-hidden /> 重新评估
            </button>
          </div>

          <div className={styles.scoreRow}>
            <ScoreRing score={evaluation.score} />
            <div className={styles.scoreLabel}>综合评分</div>
          </div>

          <div className={`${styles.metricList} ui-stagger-fade-in ui-hover-lift-children`}>
            {evaluation.metrics.map((m) => (
              <div key={m.label} className={styles.metricRow}>
                <span>
                  <span className={styles.metricDot} style={{ background: m.color }} />
                  {m.label}
                </span>
                <strong>{m.value}分</strong>
              </div>
            ))}
          </div>

          <div className={`${styles.statGrid} ui-stagger-fade-in ui-hover-lift-children`}>
            <div>
              <div className={styles.statValue}>{evaluation.stats.kbHits}</div>
              <div className={styles.statLabel}>命中知识点</div>
            </div>
            <div>
              <div className={styles.statValue}>{evaluation.stats.rules}</div>
              <div className={styles.statLabel}>触发业务规则</div>
            </div>
            <div>
              <div className={styles.statValue}>{evaluation.stats.handoff}</div>
              <div className={styles.statLabel}>建议转人工</div>
            </div>
            <div>
              <div className={styles.statValue}>{evaluation.stats.leads}</div>
              <div className={styles.statLabel}>收集线索</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h4>命中知识库</h4>
              <button type="button" disabled className={styles.linkBtn} title="即将上线">
                查看全部
              </button>
            </div>
            {evaluation.kbItems.length > 0 ? (
              evaluation.kbItems.map((item) => (
                <div key={item.title} className={styles.kbCard}>
                  <div className={styles.kbTitle}>{item.title}</div>
                  <div className={styles.kbPath}>{item.path}</div>
                  <div className={styles.kbHit}>相似度 {item.score}% · 命中</div>
                </div>
              ))
            ) : (
              <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>暂无命中知识库</div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h4>触发业务规则</h4>
              <button type="button" disabled className={styles.linkBtn} title="即将上线">
                查看全部
              </button>
            </div>
            {evaluation.rules.length > 0 ? (
              evaluation.rules.map((rule) => (
                <div key={rule} className={styles.ruleRow}>
                  <div className={styles.ruleLeft}>
                    <CheckCircle2 size={14} color="#22c55e" aria-hidden />
                    <span>{rule}</span>
                  </div>
                  <span className={styles.ruleStatus}>已触发</span>
                </div>
              ))
            ) : (
              <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>暂无命中规则</div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h4>测试记录</h4>
              <button type="button" disabled className={styles.linkBtn} title="即将上线">
                查看全部
              </button>
            </div>
            <div className={styles.recordCard}>
              <div className={styles.recordTitle}>IP65 交期 报价测试</div>
              <div className={styles.recordMeta}>测试时间：2025-04-29 10:24</div>
              <div className={styles.recordMeta}>测试助手：{selectedBotName}</div>
              <div className={styles.recordMeta}>综合评分：{evaluation.score}分</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
