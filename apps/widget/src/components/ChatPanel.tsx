import { useEffect, useRef } from "react";

import type { WidgetConnectionState, WidgetConfig } from "../lib/types";
import { ChatComposer } from "./ChatComposer";
import { CloseIcon, RobotIcon } from "./icons";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { MessageList } from "./MessageList";
import { RecommendedQuestions } from "./RecommendedQuestions";
import { useFocusTrap } from "../hooks/use-focus-trap";
import styles from "../styles/widget.module.css";
import type { ChatMessage } from "../lib/types";

interface ChatPanelProps {
  config: WidgetConfig;
  accent: string;
  headerSubtitle?: string;
  open: boolean;
  messages: ChatMessage[];
  draft: string;
  connectionState: WidgetConnectionState;
  statusMessage?: string;
  statusTone?: "info" | "error" | "success";
  recommendedQuestions?: string[];
  showRecommendedQuestions?: boolean;
  leadFields?: string[] | null;
  leadSubmitting?: boolean;
  leadError?: string;
  conversationId?: string;
  onLeadSubmit?: (fields: Record<string, string>) => void;
  onLeadDismiss?: () => void;
  onRecommendedQuestion?: (question: string) => void;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function ChatPanel({
  config,
  accent,
  headerSubtitle = "工业设备 · 产品咨询",
  open,
  messages,
  draft,
  connectionState,
  statusMessage,
  statusTone = "info",
  recommendedQuestions = [],
  showRecommendedQuestions = false,
  leadFields = null,
  leadSubmitting = false,
  leadError,
  conversationId,
  onLeadSubmit,
  onLeadDismiss,
  onRecommendedQuestion,
  onClose,
  onDraftChange,
  onSend,
}: ChatPanelProps) {
  const busy = connectionState === "loading" || connectionState === "streaming";
  const leadPanelRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Focus trap: Tab cycling + ESC close + auto-focus + focus restore
  useFocusTrap(rootRef, { active: open, onEscape: onClose });

  useEffect(() => {
    if (!leadFields?.length) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      leadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () => cancelAnimationFrame(frame);
  }, [leadFields]);

  return (
    <div
      ref={rootRef}
      className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      style={{ "--widget-accent": accent } as React.CSSProperties}
      role="dialog"
      aria-label={config.title}
      aria-hidden={!open}
    >
      <header className={styles.header}>
        <div className={styles.headerAvatar} aria-hidden="true">
          <RobotIcon size={26} />
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.headerTitle}>
            {config.title}
            <span className={styles.statusBadge}>
              <span className={styles.statusBadgeDot} />
              在线
            </span>
          </div>
          <div className={styles.headerSubtitle}>{headerSubtitle}</div>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="关闭"
          onClick={onClose}
        >
          <CloseIcon size={18} />
        </button>
      </header>

      {statusMessage ? (
        <div
          className={`${styles.statusBar} ${
            statusTone === "error"
              ? styles.statusBarError
              : statusTone === "success"
                ? styles.statusBarSuccess
                : styles.statusBarInfo
          }`}
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}

      <MessageList messages={messages} accent={accent} />

      {showRecommendedQuestions && onRecommendedQuestion ? (
        <RecommendedQuestions
          questions={recommendedQuestions}
          accent={accent}
          label="首次咨询可以先这样问："
          disabled={busy}
          onSelect={onRecommendedQuestion}
        />
      ) : null}

      {leadFields && onLeadSubmit ? (
        <LeadCaptureForm
          ref={leadPanelRef}
          fields={leadFields}
          accent={accent}
          submitting={leadSubmitting}
          errorMessage={leadError}
          apiBase={config.apiBase}
          botId={config.botId}
          siteKey={config.siteKey}
          conversationId={conversationId}
          onSubmit={onLeadSubmit}
          onDismiss={onLeadDismiss}
        />
      ) : null}

      <ChatComposer
        value={draft}
        disabled={busy}
        accent={accent}
        onChange={onDraftChange}
        onSend={onSend}
      />

      <footer className={styles.poweredBy}>
        Powered by <span className={styles.poweredByBrand}>企云 AI</span>
      </footer>
    </div>
  );
}
