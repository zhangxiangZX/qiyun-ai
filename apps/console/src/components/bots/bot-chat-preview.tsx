"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";

import { Alert, Button, Input } from "@qiyun/ui";

import { ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import {
  ChatResponseOutcomeBadge,
  inferChatResponseOutcome,
} from "@/components/shared/chat-response-outcome";
import { KnowledgeCitationList, mapStreamCitation, type KnowledgeCitationItem } from "@/components/shared/knowledge-citation-list";
import { fetchConsoleMode, isUpstreamMode } from "@/lib/api/mode";
import type { BotDetail } from "@/lib/bots/types";
import {
  getPreviewBotContext,
  streamChatMessage,
  syncPreviewBot,
  type PreviewBotContext,
} from "@/lib/chat/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: KnowledgeCitationItem[];
  needsLeadCapture?: boolean;
}

export interface BotChatPreviewProps {
  bot: BotDetail;
}

export function BotChatPreview({ bot }: BotChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: bot.welcomeMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [previewError, setPreviewError] = useState<{
    kind?: "network" | "permission" | "preview" | "rateLimit" | "unknown";
    message: string;
  } | null>(null);
  const [previewContext, setPreviewContext] = useState<PreviewBotContext | null>(null);
  const [dataMode, setDataMode] = useState<"loading" | "preview" | "upstream">("loading");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const visitorIdRef = useRef(`visitor_preview_${bot.id}`);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setDataMode(isUpstreamMode(info) ? "upstream" : "preview"))
      .catch(() => setDataMode("preview"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBootstrapping(true);
      setPreviewError(null);

      try {
        const context = await syncPreviewBot({
          botId: bot.id,
          name: bot.name,
          status: bot.status,
          knowledgeBaseIds: bot.knowledgeBaseIds,
        });

        if (!cancelled) {
          setPreviewContext(context);
        }
      } catch {
        try {
          const context = await getPreviewBotContext(bot.id);
          if (!cancelled) {
            setPreviewContext(context);
          }
        } catch (error) {
          if (!cancelled) {
            const presentation = resolveRequestErrorPresentation(
              error,
              "无法初始化聊天预览。",
            );
            setPreviewError(presentation);
          }
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [bot.id, bot.knowledgeBaseIds, bot.name, bot.status]);

  useEffect(() => {
    setMessages([
      {
        id: `welcome-${bot.id}`,
        role: "assistant",
        content: bot.welcomeMessage,
      },
    ]);
    setInput("");
    setConversationId(undefined);
    visitorIdRef.current = `visitor_preview_${bot.id}`;
  }, [bot.id, bot.welcomeMessage, bot.recommendedQuestions]);

  const canSend =
    input.trim().length > 0 && !sending && !bootstrapping && Boolean(previewContext);

  async function handleSend(textOverride?: string) {
    const question = (textOverride ?? input).trim();
    if (!question || sending || bootstrapping || !previewContext) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    setPreviewError(null);

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
          needsLeadCapture: result.needsLeadCapture,
          citations: result.citations.map((item, index) =>
            mapStreamCitation({
              ...item,
              chunkId: item.chunkId ?? `preview-citation-${index}`,
            }),
          ),
        },
      ]);

      window.setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (error) {
      setPreviewError(resolveRequestErrorPresentation(error, "发送失败，请重试。"));
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: bot.welcomeMessage,
      },
    ]);
    setInput("");
    setConversationId(undefined);
    setPreviewError(null);
  }

  const header = useMemo(() => bot.name, [bot.name]);

  return (
    <aside className="flex h-full min-h-[420px] flex-col rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {dataMode === "upstream" ? "API 预览" : "本地预览"}
            </p>
            {dataMode !== "loading" ? <ConsoleModeBadge /> : null}
          </div>
          <h3 className="text-sm font-semibold text-card-foreground">{header}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          重置
        </Button>
      </div>

      {previewError ? (
        <div className="border-b border-border p-3">
          <ConsoleRequestError kind={previewError.kind} message={previewError.message} />
        </div>
      ) : null}

      {dataMode === "preview" ? (
        <div className="border-b border-border p-3">
          <Alert variant="warning" title="Console 本地预览 BFF">
            未连接 apps/api。消息走 Console 内存模拟，引用为演示数据；可用于 UI 联调，但不会写入真实后端。
          </Alert>
        </div>
      ) : null}

      {dataMode === "upstream" ? (
        <div className="border-b border-border p-3">
          <Alert variant="success" title="真实 API 流式聊天">
            消息与知识引用经 BFF 代理至 apps/api；引用片段与可信度来自真实检索结果。
          </Alert>
        </div>
      ) : null}

      {bot.status !== "enabled" ? (
        <div className="border-b border-border p-3">
          <Alert variant="warning" title="机器人未启用">
            预览 BFF 要求机器人为已启用状态，请先在基础设置中启用。
          </Alert>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const outcome =
            message.role === "assistant"
              ? inferChatResponseOutcome({
                  citations: message.citations,
                  needsLeadCapture: message.needsLeadCapture,
                })
              : null;

          return (
          <div
            key={message.id}
            className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-card bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] rounded-card border border-border bg-background px-3 py-2 text-sm text-card-foreground"
              }
            >
              {outcome ? (
                <div className="mb-2">
                  <ChatResponseOutcomeBadge outcome={outcome} compact />
                </div>
              ) : null}
              <p>{message.content}</p>
              {message.citations?.length ? (
                <div className="mt-3 border-t border-border/70 pt-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">知识引用</p>
                  <KnowledgeCitationList citations={message.citations} compact />
                </div>
              ) : message.role === "assistant" && outcome !== "knowledge_hit" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {outcome === "needs_lead"
                    ? "未命中知识库，已触发留资引导。"
                    : "本次回复未返回知识引用。"}
                </p>
              ) : null}
            </div>
          </div>
        );
        })}
        {messages.length === 1 && bot.recommendedQuestions.length ? (
          <div className="flex flex-wrap gap-2">
            {bot.recommendedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-left text-xs text-card-foreground transition-colors hover:bg-accent disabled:opacity-50"
                disabled={sending || bootstrapping || !previewContext}
                onClick={() => void handleSend(question)}
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}
        {sending || bootstrapping ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {bootstrapping ? "正在初始化预览环境…" : "正在生成回复…"}
          </div>
        ) : null}
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入测试问题…"
            disabled={sending || bootstrapping || !previewContext}
            aria-label="测试消息"
            className="min-h-11"
          />
          <Button type="submit" disabled={!canSend} className="min-h-11 min-w-11" aria-label="发送">
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
    </aside>
  );
}
