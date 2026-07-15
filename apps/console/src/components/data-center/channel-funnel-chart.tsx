import styles from "@/styles/channel-analysis.module.css";

type FunnelStep = { label: string; count: number };

export function ChannelFunnelChart({
  steps,
  overallRate,
}: {
  steps: FunnelStep[];
  overallRate: string;
}) {
  const [s0, s1, s2, s3, s4] = steps;

  return (
    <div>
      <h3 className={styles.cardTitle}>渠道转化漏斗</h3>
      <svg className={styles.channelFunnelSvg} viewBox="0 0 280 300" aria-hidden>
        <defs>
          <linearGradient id="cf-f1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="cf-f2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="cf-f3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          <linearGradient id="cf-f4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="cf-f5" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#eff6ff" />
          </linearGradient>
        </defs>
        <polygon points="20,20 260,20 230,70 50,70" fill="url(#cf-f1)" />
        <polygon points="50,75 230,75 210,120 70,120" fill="url(#cf-f2)" />
        <polygon points="70,125 210,125 195,170 85,170" fill="url(#cf-f3)" />
        <polygon points="85,175 195,175 185,220 95,220" fill="url(#cf-f4)" />
        <polygon points="95,225 185,225 175,270 105,270" fill="url(#cf-f5)" />
        {s0 ? (
          <text x="140" y="48" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="600">
            {s0.label} {s0.count.toLocaleString("zh-CN")}
          </text>
        ) : null}
        {s1 ? (
          <text x="140" y="100" fontSize="12" fill="#1e293b" textAnchor="middle" fontWeight="600">
            {s1.label} {s1.count.toLocaleString("zh-CN")}
          </text>
        ) : null}
        {s2 ? (
          <text x="140" y="150" fontSize="12" fill="#1e293b" textAnchor="middle" fontWeight="600">
            {s2.label} {s2.count.toLocaleString("zh-CN")}
          </text>
        ) : null}
        {s3 ? (
          <text x="140" y="200" fontSize="12" fill="#1e293b" textAnchor="middle" fontWeight="600">
            {s3.label} {s3.count.toLocaleString("zh-CN")}
          </text>
        ) : null}
        {s4 ? (
          <text x="140" y="250" fontSize="12" fill="#1e293b" textAnchor="middle" fontWeight="600">
            {s4.label} {s4.count.toLocaleString("zh-CN")}
          </text>
        ) : null}
      </svg>
      <div className={styles.funnelFooter}>
        <span>
          整体转化率 <strong>{overallRate}</strong>
        </span>
        <span>
          较上期 <span className={styles.trendUp}>↑ 0.2pp</span>
        </span>
      </div>
    </div>
  );
}
