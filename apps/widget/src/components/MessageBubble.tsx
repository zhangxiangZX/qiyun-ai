import styles from "../styles/widget.module.css";
import { RobotIcon } from "./icons";
import { renderMarkdownToHtml } from "../lib/render-markdown";
import type { CitationItem } from "../lib/types";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  accent: string;
  streaming?: boolean;
  loading?: boolean;
  citations?: CitationItem[];
}

export function MessageBubble({
  role,
  content,
  accent,
  streaming,
  loading,
  citations = [],
}: MessageBubbleProps) {
  const isUser = role === "user";
  const html = !loading && content ? renderMarkdownToHtml(content) : "";
  const showCitations = !isUser && !streaming && !loading && citations.length > 0;

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
        {showCitations ? (
          <details className={styles.citations} open>
            <summary className={styles.citationsTitle}>资料来源（{citations.length}）</summary>
            <ul className={styles.citationList}>
              {citations.slice(0, 3).map((item, index) => {
                const title = item.documentTitle || item.title || `资料 ${index + 1}`;
                return (
                  <li key={`${title}-${index}`} className={styles.citation}>
                    <span className={styles.citationTitle}>{title}</span>
                    {item.snippet ? <p className={styles.citationSnippet}>{item.snippet}</p> : null}
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
