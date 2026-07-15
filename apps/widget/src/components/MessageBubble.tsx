import styles from "../styles/widget.module.css";
import { RobotIcon } from "./icons";
import { renderMarkdownToHtml } from "../lib/render-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  accent: string;
  streaming?: boolean;
  loading?: boolean;
}

export function MessageBubble({
  role,
  content,
  accent,
  streaming,
  loading,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const html = !loading && content ? renderMarkdownToHtml(content) : "";

  return (
    <div className={`${styles.bubbleRow} ${isUser ? styles.bubbleRowUser : ""}`}>
      <div className={`${styles.bubbleAvatar} ${isUser ? styles.bubbleAvatarUser : ""}`} aria-hidden="true">
        {isUser ? <span className={styles.bubbleAvatarUserInitial}>我</span> : <RobotIcon size={18} />}
      </div>
      <div
        className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}
        style={isUser ? { background: accent } : undefined}
      >
        <div className={styles.bubbleText}>
          {loading ? (
            <span className={styles.loadingHint}>正在查阅资料…</span>
          ) : html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : streaming ? (
            "…"
          ) : (
            ""
          )}
          {streaming && !loading && content ? <span className={styles.cursor} aria-hidden /> : null}
        </div>
      </div>
    </div>
  );
}
