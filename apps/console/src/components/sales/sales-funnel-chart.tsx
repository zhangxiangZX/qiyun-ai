import styles from "@/styles/sales-funnel.module.css";

/** 成交漏斗页 · 六层渐变漏斗（与稿面 index.html 一致） */
export function SalesFunnelChart() {
  return (
    <svg className={styles.funnelSvg} viewBox="0 0 260 340" aria-hidden>
      <defs>
        <linearGradient id="sf-g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="sf-g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="sf-g3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="sf-g4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="sf-g5" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="sf-g6" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <polygon points="10,10 250,10 225,65 35,65" fill="url(#sf-g1)" />
      <polygon points="35,68 225,68 205,123 55,123" fill="url(#sf-g2)" />
      <polygon points="55,126 205,126 185,181 75,181" fill="url(#sf-g3)" />
      <polygon points="75,184 185,184 165,239 95,239" fill="url(#sf-g4)" />
      <polygon points="95,242 165,242 145,297 115,297" fill="url(#sf-g5)" />
      <polygon points="115,300 145,300 138,330 122,330" fill="url(#sf-g6)" />
      <text x="130" y="42" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
        新询盘
      </text>
      <text x="130" y="100" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
        有效询盘
      </text>
      <text x="130" y="158" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
        沟通中
      </text>
      <text x="130" y="216" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
        报价中
      </text>
      <text x="130" y="274" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
        谈判中
      </text>
      <text x="130" y="322" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
        已成交
      </text>
    </svg>
  );
}
