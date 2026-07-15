import { useEffect, useRef } from "react";

import type { ChatMessage } from "../lib/types";
import { MessageBubble } from "./MessageBubble";
import styles from "../styles/widget.module.css";

interface MessageListProps {
  messages: ChatMessage[];
  accent: string;
}

export function MessageList({ messages, accent }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isStreaming = messages.some((message) => message.status === "streaming");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isStreaming ? "auto" : "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isStreaming]);

  return (
    <div
      ref={containerRef}
      className={styles.messages}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          accent={accent}
          streaming={message.status === "streaming"}
          loading={message.status === "streaming" && !message.content.trim()}
        />
      ))}
    </div>
  );
}
