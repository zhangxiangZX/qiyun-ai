"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  Label,
  PageHeader,
  Skeleton,
} from "@qiyun/ui";
import {
  Bot,
  Loader2,
  MessageSquare,
  Paperclip,
  Play,
  Send,
  Star,
  Trash2,
} from "lucide-react";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ChatResponseOutcomeBadge } from "@/components/shared/chat-response-outcome";
import { getBotDetail } from "@/lib/bots/data";
import {
  getPreviewBotContext,
  streamChatMessage,
  syncPreviewBot,
} from "@/lib/chat/api";
import { testBotChat } from "@/lib/conversations/ai-test-api";
import { useApiResource } from "@/lib/api/use-api-resource";
import {
  AI_TEST_BOTS,
  formatTime,
  getAiTestInitialMessages,
  getAiTestMockReply,
  inferAiTestOutcome,
  type AiTestBot,
  type AiTestMessage,
} from "@/lib/conversations/ai-test-mock-data";
import {
  AI_TEST_CONFIG,
  AI_TEST_INTENT,
  AI_TEST_KB_SNIPPETS,
  AI_TEST_KNOWLEDGE_BASES,
  AI_TEST_QUALITY,
  AI_TEST_SOURCES,
} from "@/lib/conversations/ai-test-panel-mock";

const MAX_INPUT = 1000;

function StreamingText({ text, active }: { text: string; active: boolean }) {
  const [shown, setShown] = useState(active ? "" : text);
  useEffect(() => {
    if (!active) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const timer = window.setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [text, active]);
  return <>{shown}</>;
}

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < Math.floor(score)
              ? "fill-amber-400 text-amber-400"
              : index < score
                ? "fill-amber-200 text-amber-400"
                : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function AiTestWorkspace() {
  const { data: bots, loading, isPreview } = useApiResource<AiTestBot[]>("/bots", AI_TEST_BOTS);

  const [selectedBotId, setSelectedBotId] = useState("");
  const [selectedKbId, setSelectedKbId] = useState(AI_TEST_KNOWLEDGE_BASES[0]!.id);
  const [messages, setMessages] = useState<AiTestMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [manualEval, setManualEval] = useState<"accurate" | "optimize" | "miss" | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const visitorIdRef = useRef(`visitor_ai_test_${Date.now().toString(36)}`);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedBot = useMemo(
    () => bots.find((b) => b.id === selectedBotId) ?? bots[0],
    [bots, selectedBotId],
  );

  useEffect(() => {
    if (!selectedBotId && bots.length > 0) {
      const preferred = bots.find((b) => b.status === "enabled") ?? bots[0];
      setSelectedBotId(preferred.id);
    }
  }, [bots, selectedBotId]);

  useEffect(() => {
    if (selectedBotId && started) {
      setMessages(getAiTestInitialMessages(selectedBotId));
      setManualEval(null);
    }
  }, [selectedBotId, started]);

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return "";
  }, [messages]);

  function scrollToBottom() {
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  }

  function handleStart() {
    if (!selectedBot) return;
    setStarted(true);
    setConversationId(undefined);
    visitorIdRef.current = `visitor_ai_test_${selectedBot.id}_${Date.now().toString(36)}`;
    setMessages(getAiTestInitialMessages(selectedBot.id));
    scrollToBottom();
  }

  function handleClear() {
    setClearOpen(false);
    if (!selectedBot) return;
    setConversationId(undefined);
    visitorIdRef.current = `visitor_ai_test_${selectedBot.id}_${Date.now().toString(36)}`;
    setMessages([
      {
        id: `welcome-${selectedBot.id}-${Date.now()}`,
        role: "assistant",
        content: selectedBot.welcomeMessage,
        time: formatTime(),
      },
    ]);
    setManualEval(null);
    scrollToBottom();
  }

  function handleSend() {
    const question = input.trim();
    if (!question || thinking || !selectedBot || !started) return;

    const userMessage: AiTestMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      time: formatTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);
    scrollToBottom();

    void (async () => {
      const startedAt = Date.now();
      try {
        let previewContext;
        try {
          previewContext = await getPreviewBotContext(selectedBot.id);
        } catch {
          const detail = await getBotDetail(selectedBot.id);
          previewContext = await syncPreviewBot({
            botId: selectedBot.id,
            name: detail?.name ?? selectedBot.name,
            status: detail?.status ?? selectedBot.status,
            knowledgeBaseIds: detail?.knowledgeBaseIds ?? [],
          });
        }

        const result = await streamChatMessage({
          botId: previewContext.botId,
          siteKey: previewContext.siteKey,
          visitorId: visitorIdRef.current,
          conversationId,
          origin: previewContext.origin,
          message: question,
        });
        setConversationId(result.conversationId);

        const kbHits = result.citations?.length ?? 0;
        const outcome = result.needsLeadCapture
          ? "needs_lead"
          : inferAiTestOutcome(question, kbHits);
        const reply: AiTestMessage = {
          id: result.messageId || `assistant-${Date.now()}`,
          role: "assistant",
          content: result.content,
          time: formatTime(),
          outcome,
          debug: {
            tokens: Math.max(32, Math.round(result.content.length / 2)),
            latencyMs: Math.max(1, Date.now() - startedAt),
            kbHits,
            model: selectedBot.model,
          },
        };
        setMessages((prev) => [...prev, reply]);
      } catch (streamError) {
        try {
          const result = await testBotChat(selectedBot.id, question);
          const reply: AiTestMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.reply,
            time: formatTime(),
            outcome: result.reply.includes("知识库未激活") ? "no_knowledge" : "knowledge_hit",
            debug: {
              tokens: Math.max(32, Math.round(result.reply.length / 2)),
              latencyMs: Math.max(1, Date.now() - startedAt),
              kbHits: result.reply.includes("已检索到") ? 1 : 0,
              model: selectedBot.model,
            },
          };
          setMessages((prev) => [...prev, reply]);
        } catch (error) {
          const reason =
            streamError instanceof Error
              ? streamError.message
              : error instanceof Error
                ? error.message
                : "未知错误";
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-fallback-${Date.now()}`,
              role: "assistant",
              content: `暂时无法完成真实 RAG 回答（${reason}）。已回退到本地示例回复，仅供界面预览。\n\n${getAiTestMockReply(selectedBot.id, question).content}`,
              time: formatTime(),
              outcome: "no_knowledge",
              debug: {
                tokens: 0,
                latencyMs: Math.max(1, Date.now() - startedAt),
                kbHits: 0,
                model: selectedBot.model,
              },
            },
          ]);
        }
      } finally {
        setThinking(false);
        scrollToBottom();
      }
    })();
  }

  if (loading && !isPreview) {
    return (
      <ConsolePage>
        <PageHeader title="AI 对话测试" description="在发布前测试助手回复效果，验证知识库命中与留资引导" />
        <Skeleton className="h-[70vh] w-full rounded-2xl" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="AI 对话测试" />
      </ConsolePageAlerts>

      <PageHeader
        title="AI 对话测试"
        description="管理企业专属 AI 助手，配置知识与能力，持续优化客户对话体验"
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-end">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-muted-foreground">选择助手</span>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={selectedBotId}
              onChange={(event) => {
                setSelectedBotId(event.target.value);
                setStarted(false);
              }}
            >
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-muted-foreground">选择知识库</span>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={selectedKbId}
              onChange={(event) => setSelectedKbId(event.target.value)}
            >
              {AI_TEST_KNOWLEDGE_BASES.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={handleStart} disabled={!selectedBot}>
            <Play className="mr-1.5 h-4 w-4" />
            开始测试
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="flex min-h-[640px] flex-col rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">对话测试（实时预览）</h2>
              <Button variant="ghost" size="sm" type="button" onClick={() => setClearOpen(true)} disabled={!started}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                清空对话
              </Button>
            </div>

            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {!started ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <Bot className="mb-3 h-10 w-10 text-primary/50" />
                  选择助手与知识库后，点击「开始测试」进入对话预览
                </div>
              ) : (
                <>
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <div key={message.id} className="flex justify-end gap-2">
                        <div className="max-w-[85%]">
                          <div className="rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                            {message.content}
                          </div>
                          <div className="mt-1 text-right text-[11px] text-muted-foreground">{message.time}</div>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                          访
                        </span>
                      </div>
                    ) : (
                      <div key={message.id} className="flex justify-start gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${selectedBot?.avatarClass ?? "bg-muted"}`}
                        >
                          {selectedBot?.avatar ?? "🤖"}
                        </span>
                        <div className="max-w-[85%]">
                          {message.outcome ? (
                            <div className="mb-1.5">
                              <ChatResponseOutcomeBadge outcome={message.outcome} compact />
                            </div>
                          ) : null}
                          <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed">
                            <StreamingText text={message.content} active={message.id === lastAssistantId} />
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">{message.time}</div>
                        </div>
                      </div>
                    ),
                  )}
                  {thinking ? (
                    <div className="flex items-center gap-2 pl-10 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      思考中…
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {started && messages.some((m) => m.outcome === "needs_lead") ? (
              <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                已触发留资引导：该问题涉及报价/交期等，建议引导访客留下联系方式由销售跟进。
              </div>
            ) : null}

            <form
              className="border-t border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
            >
              <Label htmlFor="ai-test-input" className="sr-only">
                测试问题
              </Label>
              <textarea
                id="ai-test-input"
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, MAX_INPUT))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!started || thinking}
                placeholder="请输入你的问题，Enter 发送，Shift + Enter 换行"
                className="min-h-20 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    附件
                  </button>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setInput("")}
                  >
                    清空输入
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {input.length}/{MAX_INPUT}
                  </span>
                  <Button type="submit" size="sm" disabled={!input.trim() || !started || thinking}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    发送
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <Panel title="测试配置">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["模型", AI_TEST_CONFIG.model],
                  ["Temperature", String(AI_TEST_CONFIG.temperature)],
                  ["Top P", String(AI_TEST_CONFIG.topP)],
                  ["Max Token", String(AI_TEST_CONFIG.maxToken)],
                  ["对话轮次", String(AI_TEST_CONFIG.rounds)],
                  ["开始时间", AI_TEST_CONFIG.startedAt],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-0.5 font-medium text-foreground">{value}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="命中知识片段"
              action={
                <button type="button" className="text-xs text-primary hover:underline">
                  查看全部 &gt;
                </button>
              }
            >
              <ul className="space-y-3">
                {AI_TEST_KB_SNIPPETS.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={item.tone === "high" ? "success" : "warning"}>
                        {item.score.toFixed(2)}
                      </Badge>
                      <span className="text-xs text-primary">{item.source}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{item.text}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Panel title="意图识别">
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">主意图</div>
                    <div className="font-medium">
                      {AI_TEST_INTENT.primary}{" "}
                      <span className="text-xs text-emerald-600">
                        {AI_TEST_INTENT.primaryScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">子意图</div>
                    <div className="font-medium">
                      {AI_TEST_INTENT.secondary}{" "}
                      <span className="text-xs text-emerald-600">
                        {AI_TEST_INTENT.secondaryScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="来源文档">
                <ul className="space-y-2 text-sm">
                  {AI_TEST_SOURCES.map((source) => (
                    <li key={source.name} className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground">{source.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {source.score.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="回答质量评分">
              <div className="flex items-center gap-3">
                <StarRow score={AI_TEST_QUALITY.overall} />
                <span className="text-lg font-semibold text-foreground">
                  {AI_TEST_QUALITY.overall} / 5.0
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["准确性", AI_TEST_QUALITY.accuracy],
                  ["完整性", AI_TEST_QUALITY.completeness],
                  ["相关性", AI_TEST_QUALITY.relevance],
                  ["可用性", AI_TEST_QUALITY.usability],
                ].map(([label, score]) => (
                  <div key={label} className="rounded-md bg-muted/30 px-2 py-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="ml-1 font-semibold text-foreground">{score}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="人工评估">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "accurate" as const, label: "回答准确", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                  { key: "optimize" as const, label: "需优化", className: "border-amber-200 bg-amber-50 text-amber-700" },
                  { key: "miss" as const, label: "未命中", className: "border-red-200 bg-red-50 text-red-700" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setManualEval(item.key)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      manualEval === item.key ? item.className : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                评估结果将用于优化模型效果
                {isPreview ? "（当前为预览模式）" : ""}
              </p>
            </Panel>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={clearOpen}
        icon="warning"
        title="清空当前对话？"
        description="将移除全部测试消息并恢复欢迎语。"
        confirmLabel="清空对话"
        cancelLabel="取消"
        destructive
        onConfirm={handleClear}
        onCancel={() => setClearOpen(false)}
      />
    </ConsolePage>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
