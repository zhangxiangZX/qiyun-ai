import styles from "@/styles/home-overview.module.css";

/** 成交漏斗示意图（与稿面一致的五色分层漏斗） */
export function HomeFunnelChart() {
  return (
    <svg className={styles.funnelSvg} viewBox="0 0 200 252" fill="none" aria-hidden>
      <polygon points="8,0 192,0 172,48 28,48" fill="#3F5EFF" />
      <polygon points="28,50 172,50 154,98 46,98" fill="#4D88FA" />
      <polygon points="46,100 154,100 138,148 62,148" fill="#45C4EE" />
      <polygon points="62,150 138,150 122,198 78,198" fill="#4BCF8A" />
      <polygon points="78,200 122,200 108,248 92,248" fill="#F5B942" />
    </svg>
  );
}
