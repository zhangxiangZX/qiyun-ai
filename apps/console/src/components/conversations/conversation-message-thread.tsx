"use client";

import { useEffect, useRef } from "react";
import { Bot, Clock3, Cpu } from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { formatLatency, formatShortDateTime } from "@/lib/conversations/format";
import type { ConversationDetail } from "@/lib/conversations/types";

export interface ConversationMessageThreadProps {
  conversation: ConversationDetail | null;
  loading?: boolean;
}

export function ConversationMessageThread({
  conversation,
  loading = false,
}: ConversationMessageThreadProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [conversation?.id, conversation?.messages.length]);

  if (loading) {
    return (
      <div className="flex h-full flex-col p-4">
        <Skeleton className="h-8 w-48" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-24 w-3/4" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        选择左侧会话查看消息记录
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{conversation.visitorLabel}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{conversation.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            {conversation.botName}
          </span>
          <span>{formatShortDateTime(conversation.createdAt)}</span>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {conversation.messages.map((message) => {
          if (message.role === "system") {
            return (
              <div key={message.id} className="text-center text-xs text-muted-foreground">
                {message.content}
              </div>
            );
          }

          const isUser = message.role === "user";

          return (
            <article
              key={message.id}
              className={isUser ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-card bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-card border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-sm"
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {!isUser && message.citations?.length ? (
                  <div className="mt-3 space-y-2 border-t border-border/70 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">引用来源</p>
                    {message.citations.map((citation) => (
                      <div
                        key={citation.id}
                        className="rounded-control bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground"
                      >
                        <p className="font-medium text-foreground">{citation.title}</p>
                        <p className="mt-1">{citation.excerpt}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!isUser && (message.model || message.latencyMs) ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {message.model ? (
                      <span className="inline-flex items-center gap-1">
                        <Cpu className="h-3 w-3" aria-hidden />
                        {message.model}
                        {message.tokenCount ? ` · ${message.tokenCount} tokens` : ""}
                      </span>
                    ) : null}
                    {message.latencyMs ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" aria-hidden />
                        {formatLatency(message.latencyMs)}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatShortDateTime(message.createdAt)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
