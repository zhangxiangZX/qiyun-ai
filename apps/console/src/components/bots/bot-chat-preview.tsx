"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";

import { Button, Input } from "@qiyun/ui";

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
  citations?: Array<{ title: string; snippet: string }>;
  needsLeadCapture?: boolean;
}

export interface BotChatPreviewProps {
  bot: BotDetail;
}

/**
 * Lightweight bot chat preview for the edit shell.
 * Kept dependency-light to avoid webpack module-factory failures in the bot layout chunk.
 */
export function BotChatPreview({ bot }: BotChatPreviewProps) {
  const welcomeMessage = bot.welcomeMessage?.trim() || "你好，有什么可以帮你？";
  const recommendedQuestions = Array.isArray(bot.recommendedQuestions)
    ? bot.recommendedQuestions.filter((item) => Boolean(item?.trim()))
    : [];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setErrorMessage(null);
      try {
        const context = await syncPreviewBot({
          botId: bot.id,
          name: bot.name,
          status: bot.status,
          knowledgeBaseIds: bot.knowledgeBaseIds ?? [],
        });
        if (!cancelled) setPreviewContext(context);
      } catch {
        try {
          const context = await getPreviewBotContext(bot.id);
          if (!cancelled) setPreviewContext(context);
        } catch (error) {
          if (!cancelled) {
            setErrorMessage(error instanceof Error ? error.message : "无法初始化聊天预览。");
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
  }, [bot.id, bot.knowledgeBaseIds, bot.name, bot.status]);

  useEffect(() => {
    setMessages([{ id: `welcome-${bot.id}`, role: "assistant", content: welcomeMessage }]);
    setInput("");
    setConversationId(undefined);
    visitorIdRef.current = `visitor_preview_${bot.id}`;
  }, [bot.id, welcomeMessage]);

  const canSend =
    input.trim().length > 0 && !sending && !bootstrapping && Boolean(previewContext);

  async function handleSend(textOverride?: string) {
    const question = (textOverride ?? input).trim();
    if (!question || sending || bootstrapping || !previewContext) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: question },
    ]);
    setInput("");
    setSending(true);
    setErrorMessage(null);

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
          content: result.content || "（无回复内容）",
          needsLeadCapture: result.needsLeadCapture,
          citations: (result.citations ?? []).map((item) => ({
            title: item.title,
            snippet: item.snippet,
          })),
        },
      ]);

      window.setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发送失败，请重试。");
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setMessages([{ id: "welcome-reset", role: "assistant", content: welcomeMessage }]);
    setInput("");
    setConversationId(undefined);
    setErrorMessage(null);
  }

  return (
    <aside className="flex h-full min-h-[420px] flex-col rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {dataMode === "upstream" ? "API 预览" : dataMode === "preview" ? "本地预览" : "加载中"}
          </p>
          <h3 className="text-sm font-semibold text-card-foreground">{bot.name}</h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          重置
        </Button>
      </div>

      {errorMessage ? (
        <div className="border-b border-border px-4 py-3 text-sm text-destructive">{errorMessage}</div>
      ) : null}

      {bot.status !== "enabled" ? (
        <div className="border-b border-border px-4 py-3 text-xs text-amber-800 bg-amber-50/70">
          机器人未启用时，预览可能无法发送真实消息。
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
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
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.needsLeadCapture ? (
                <p className="mt-2 text-xs opacity-80">已触发留资引导</p>
              ) : null}
              {message.citations?.length ? (
                <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">知识引用</p>
                  {message.citations.slice(0, 3).map((citation, index) => (
                    <p key={`${citation.title}-${index}`} className="text-xs text-muted-foreground">
                      · {citation.title}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {messages.length === 1 && recommendedQuestions.length ? (
          <div className="flex flex-wrap gap-2">
            {recommendedQuestions.map((question) => (
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

export default BotChatPreview;
