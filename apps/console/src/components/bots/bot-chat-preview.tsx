"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, Send } from "lucide-react";

import { Alert, Button, Input, Label } from "@qiyun/ui";

import { ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { streamChatMessage } from "@/lib/chat/api";
import { streamPreviewChatMessage } from "@/lib/chat/preview-stream";
import type { BotDetail } from "@/lib/bots/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ title: string; snippet: string }>;
  needsLeadCapture?: boolean;
  streaming?: boolean;
}

export interface BotChatPreviewProps {
  bot: BotDetail;
}

export function BotChatPreview({ bot }: BotChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: bot.welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [siteKey, setSiteKey] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setPreviewMode(isPreviewMode(info)))
      .catch(() => setPreviewMode(true));
  }, []);

  useEffect(() => {
    setMessages([{ id: `welcome-${bot.id}`, role: "assistant", content: bot.welcomeMessage }]);
    setInput("");
    setConversationId(undefined);
    setErrorMessage(null);
  }, [bot.id, bot.welcomeMessage]);

  const canSend = input.trim().length > 0 && !sending;
  const origin =
    bot.allowedDomains[0] != null ? `https://${bot.allowedDomains[0]}` : window.location.origin;

  async function handleSend() {
    if (!canSend) return;

    const question = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };

    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setSending(true);
    setErrorMessage(null);

    try {
      const result = previewMode
        ? await streamPreviewChatMessage({ bot, message: question, conversationId })
        : await streamChatMessage({
            botId: bot.id,
            siteKey: siteKey.trim(),
            visitorId: "console_preview_visitor",
            conversationId,
            message: question,
            origin,
          });

      setConversationId(result.conversationId);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                id: result.messageId || assistantId,
                role: "assistant",
                content: result.content,
                citations: result.citations,
                needsLeadCapture: result.needsLeadCapture,
              }
            : message,
        ),
      );
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      setErrorMessage(error instanceof Error ? error.message : "发送失败，请稍后重试。");
    } finally {
      setSending(false);
      window.setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }

  function handleReset() {
    setMessages([{ id: "welcome-reset", role: "assistant", content: bot.welcomeMessage }]);
    setInput("");
    setConversationId(undefined);
    setErrorMessage(null);
  }

  return (
    <aside className="flex h-full min-h-[420px] flex-col rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              聊天预览
            </p>
            <ConsoleModeBadge />
          </div>
          <h3 className="text-sm font-semibold text-card-foreground">{bot.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {previewMode
              ? "Preview runtime：本地模拟 meta / token / citations / done"
              : "真实 API：POST /public/chat/stream"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          重置
        </Button>
      </div>

      {!previewMode ? (
        <div className="border-b border-border px-4 py-3">
          <Label htmlFor="preview-site-key" className="text-xs">
            Site Key（真实 API 必填）
          </Label>
          <Input
            id="preview-site-key"
            className="mt-1"
            value={siteKey}
            onChange={(event) => setSiteKey(event.target.value)}
            placeholder="pk_..."
            disabled={sending}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            来源域名：{origin}（须与 API 中站点白名单一致）
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="px-4 pt-3">
          <Alert variant="error" title={errorMessage} />
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
              <p className="whitespace-pre-wrap">
                {message.content}
                {message.streaming ? (
                  <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
              </p>

              {message.citations?.length ? (
                <div className="mt-2 space-y-1 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">引用来源</p>
                  {message.citations.map((citation) => (
                    <p key={`${message.id}-${citation.title}`}>
                      {citation.title}：{citation.snippet}
                    </p>
                  ))}
                </div>
              ) : null}

              {message.needsLeadCapture ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  needsLeadCapture：建议引导访客留资
                </p>
              ) : null}
            </div>
          </div>
        ))}
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
            disabled={sending}
            aria-label="测试消息"
          />
          <Button
            type="submit"
            disabled={!canSend || (!previewMode && !siteKey.trim())}
            aria-label="发送"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
    </aside>
  );
}
