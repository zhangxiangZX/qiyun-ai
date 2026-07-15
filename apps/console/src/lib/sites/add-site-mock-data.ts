import type { BotListItem } from "@/lib/bots/types";

/** Bot 列表 — 供「选择关联的 AI 助手」下拉使用 */
export function listBotsForSiteSelect(): BotListItem[] {
  return [
    {
      id: "bot-support",
      name: "官网客服",
      status: "enabled",
      knowledgeBaseCount: 2,
      conversations7d: 428,
      updatedAt: "2026-06-29T10:20:00.000Z",
    },
    {
      id: "bot-sales",
      name: "销售顾问",
      status: "enabled",
      knowledgeBaseCount: 1,
      conversations7d: 156,
      updatedAt: "2026-06-28T16:05:00.000Z",
    },
    {
      id: "bot-internal",
      name: "内部知识助手",
      status: "draft",
      knowledgeBaseCount: 3,
      conversations7d: 0,
      updatedAt: "2026-06-27T09:40:00.000Z",
    },
    {
      id: "bot-marketing",
      name: "营销助手",
      status: "enabled",
      knowledgeBaseCount: 4,
      conversations7d: 312,
      updatedAt: "2026-06-30T08:15:00.000Z",
    },
  ];
}

/** DNS 验证记录模板（根据输入的域名动态生成） */
export interface DnsVerificationRecord {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
  label: string;
}

export function generateDnsRecords(domain: string): DnsVerificationRecord[] {
  const sanitized = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  const recordPrefix = sanitized.replace(/^www\./, "").split(".")[0] || "yourdomain";

  return [
    {
      type: "TXT",
      name: `@`,
      value: `qiyun-verify=${recordPrefix}-${Math.random().toString(36).slice(2, 10)}`,
      label: "TXT 记录（域名所有权验证）",
    },
    {
      type: "CNAME",
      name: `widget`,
      value: `widget.qiyun.ai`,
      label: "CNAME 记录（Widget 子域名指向）",
    },
  ];
}

/** Widget 安装代码 — 根据 siteKey 动态生成 */
export function generateEmbedSnippet(botId: string, siteKey: string): string {
  return `<!-- 企云 AI 智能客服 Widget 开始 -->
<script>
(function(w, d, s, o){
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(o)) return;
  js = d.createElement(s); js.id = o;
  js.src = 'https://widget.qiyun.ai/loader.js';
  js.setAttribute('data-bot-id', '${botId}');
  js.setAttribute('data-site-key', '${siteKey}');
  js.async = 1;
  fjs.parentNode.insertBefore(js, fjs);
})(window, document, 'script', 'qiyunai-widget');
</script>
<!-- 企云 AI 智能客服 Widget 结束 -->`;
}

/** 生成新站点 preview siteKey */
export function generatePreviewSiteKey(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `pk_live_${suffix}`;
}

/** 初始表单值 */
export interface AddSiteFormDefaults {
  siteName: string;
  siteDomain: string;
  botId: string;
  customDomain: string;
}

export function getAddSiteFormDefaults(): AddSiteFormDefaults {
  return {
    siteName: "",
    siteDomain: "",
    botId: "",
    customDomain: "",
  };
}
