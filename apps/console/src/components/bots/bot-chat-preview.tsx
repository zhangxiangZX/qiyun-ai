"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";

import { Button, Input } from "@qiyun/ui";

import type { BotDetail } from "@/lib/bots/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

function mockReply(input: string, bot: BotDetail): { content: string; sources?: string[] } {
  const text = input.trim().toLowerCase();
  if (!text) {
    return { content: "请输入你想咨询的问题。" };
  }
  if (text.includes("价格") || text.includes("报价") || text.includes("套餐")) {
    return {
      content: "我们提供标准版与企业版两种套餐，可按坐席与知识库容量扩展。需要我帮你安排演示吗？",
      sources: ["销售话术库 / 套餐说明"],
    };
  }
  if (text.includes("接入") || text.includes("嵌入") || text.includes("安装")) {
    return {
      content: "在控制台复制安装代码，粘贴到官网 </body> 前即可。部署后可在白名单域名下使用。",
      sources: ["产品支持文档 / Widget 接入"],
    };
  }
  return {
    content: `${bot.name} 已收到你的问题。正式环境将基于关联知识库检索后回答，当前为预览模式。`,
    sources: bot.knowledgeBaseIds.length ? ["关联知识库预览"] : undefined,
  };
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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: `welcome-${bot.id}`,
        role: "assistant",
        content: bot.welcomeMessage,
      },
    ]);
    setInput("");
  }, [bot.id, bot.welcomeMessage]);

  const canSend = input.trim().length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    const question = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    const reply = mockReply(question, bot);
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply.content,
        sources: reply.sources,
      },
    ]);
    setSending(false);
    window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
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
  }

  const header = useMemo(() => bot.name, [bot.name]);

  return (
    <aside className="flex h-full min-h-[420px] flex-col rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            预览
          </p>
          <h3 className="text-sm font-semibold text-card-foreground">{header}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          重置
        </Button>
      </div>

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
              <p>{message.content}</p>
              {message.sources?.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  来源：{message.sources.join("、")}
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {sending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在生成回复…
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
            disabled={sending}
            aria-label="测试消息"
          />
          <Button type="submit" disabled={!canSend} aria-label="发送">
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
    </aside>
  );
}
