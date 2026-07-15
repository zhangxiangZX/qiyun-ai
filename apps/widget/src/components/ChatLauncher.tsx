import { RobotIcon } from "./icons";
import styles from "../styles/widget.module.css";

interface ChatLauncherProps {
  open: boolean;
  badge?: number;
  accent?: string;
  onOpen: () => void;
}

export function ChatLauncher({ open, badge = 2, accent = "#1f64eb", onOpen }: ChatLauncherProps) {
  return (
    <button
      type="button"
      className={styles.launcher}
      style={{ background: accent }}
      aria-expanded={open}
      aria-label="打开客服窗口"
      onClick={onOpen}
    >
      <RobotIcon size={30} className={styles.launcherIcon} />
      {badge > 0 ? (
        <span className={styles.launcherBadge} aria-label={`${badge} 条未读消息`}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}
