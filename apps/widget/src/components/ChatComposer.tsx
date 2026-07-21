import styles from "../styles/widget.module.css";
import { SendIcon } from "./icons";

interface ChatComposerProps {
  value: string;
  disabled: boolean;
  accent: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatComposer({ value, disabled, accent, onChange, onSend }: ChatComposerProps) {
  const canSend = !disabled && Boolean(value.trim());

  return (
    <div className={styles.composer}>
      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type="text"
          value={value}
          disabled={disabled}
          placeholder="请输入您的问题..."
          aria-label="消息输入"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
      </div>
      <button
        type="button"
        className={styles.sendButton}
        style={{ background: accent }}
        disabled={!canSend}
        aria-label="发送"
        onClick={onSend}
      >
        <SendIcon size={18} />
      </button>
    </div>
  );
}
