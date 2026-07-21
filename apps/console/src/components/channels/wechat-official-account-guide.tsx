"use client";

import { WECHAT_OFFICIAL_ACCOUNT_SOURCE } from "@/lib/public/acquisition-source";

export interface WechatOfficialAccountGuideProps {
  /** Full public URL to paste into 公众号菜单 (without source). */
  landingUrl?: string;
  /** Compact tip for settings panels; default expands steps. */
  compact?: boolean;
  className?: string;
}

/**
 * 公众号菜单使用说明 — copy-ready tip only.
 * Does NOT integrate WeChat messaging / OA deep APIs.
 */
export function WechatOfficialAccountGuide({
  landingUrl,
  compact = false,
  className,
}: WechatOfficialAccountGuideProps) {
  const withSource = landingUrl
    ? `${landingUrl}${landingUrl.includes("?") ? "&" : "?"}source=${WECHAT_OFFICIAL_ACCOUNT_SOURCE}`
    : `https://你的域名/s/选型页slug?source=${WECHAT_OFFICIAL_ACCOUNT_SOURCE}`;

  if (compact) {
    return (
      <p className={className} style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "#64748b" }}>
        公众号菜单：将带{" "}
        <code style={{ fontSize: 11 }}>source={WECHAT_OFFICIAL_ACCOUNT_SOURCE}</code>{" "}
        的链接配置到「自定义菜单 / 自动回复 / 图文」。无需对接公众号消息 API。
      </p>
    );
  }

  return (
    <aside
      className={className}
      style={{
        border: "1px solid #bbf7d0",
        background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
        borderRadius: 12,
        padding: "14px 16px",
        color: "#14532d",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>公众号菜单使用说明</div>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.65, color: "#166534" }}>
        <li>登录微信公众平台 →「内容与互动」→「自定义菜单」（或自动回复 / 图文）。</li>
        <li>
          菜单类型选「跳转网页」，粘贴公开获客链接，并带上来源参数：
          <br />
          <code
            style={{
              display: "inline-block",
              marginTop: 6,
              padding: "6px 8px",
              borderRadius: 8,
              background: "#fff",
              border: "1px solid #bbf7d0",
              fontSize: 11,
              wordBreak: "break-all",
              color: "#14532d",
            }}
          >
            {withSource}
          </code>
        </li>
        <li>保存并发布菜单。访客在微信内打开后，询盘会带上来源标识便于渠道统计。</li>
        <li>本产品不提供公众号客服消息 / 模板消息等深度 API 对接，仅使用网页链接投放。</li>
      </ol>
    </aside>
  );
}
