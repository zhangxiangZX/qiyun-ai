import type { SiteConfig, SiteKeyRotationResult, TestMessageRequest, TestMessageResult } from "./types";
import { isOriginAllowed } from "./validation";

const siteStore: Record<string, SiteConfig> = {
  "site-support": {
    id: "site-support",
    botId: "bot-support",
    botName: "官网客服",
    allowedDomains: ["www.example.com", "help.example.com"],
    siteKeyPrefix: "pk_live_8f2a",
    embedSnippet:
      '<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="bot-support" data-site-key="pk_live_8f2a***" async></script>',
    updatedAt: "2026-06-29T09:00:00.000Z",
  },
  "site-sales": {
    id: "site-sales",
    botId: "bot-sales",
    botName: "销售顾问",
    allowedDomains: ["sales.example.com"],
    siteKeyPrefix: "pk_live_3c91",
    embedSnippet:
      '<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="bot-sales" data-site-key="pk_live_3c91***" async></script>',
    updatedAt: "2026-06-28T14:20:00.000Z",
  },
  "site-internal": {
    id: "site-internal",
    botId: "bot-internal",
    botName: "内部知识助手",
    allowedDomains: ["intranet.example.com"],
    siteKeyPrefix: "pk_live_71bd",
    embedSnippet:
      '<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="bot-internal" data-site-key="pk_live_71bd***" async></script>',
    updatedAt: "2026-06-27T11:10:00.000Z",
  },
};

export function listSites(): SiteConfig[] {
  return Object.values(siteStore);
}

export function fetchSites(): Promise<SiteConfig[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(listSites()), 400);
  });
}

export function fetchSiteByBotId(botId: string): Promise<SiteConfig | null> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(Object.values(siteStore).find((site) => site.botId === botId) ?? null);
    }, 200);
  });
}

export function saveSiteDomains(siteId: string, allowedDomains: string[]): SiteConfig | null {
  const site = siteStore[siteId];
  if (!site) return null;
  site.allowedDomains = allowedDomains;
  site.updatedAt = new Date().toISOString();
  return site;
}

export function rotateSiteKey(siteId: string): SiteKeyRotationResult | null {
  const site = siteStore[siteId];
  if (!site) return null;
  const suffix = Math.random().toString(36).slice(2, 10);
  const fullKey = `pk_live_${suffix}`;
  site.siteKeyPrefix = fullKey.slice(0, 12);
  site.embedSnippet = `<script src="https://cdn.qiyun.ai/widget.js" data-bot-id="${site.botId}" data-site-key="${fullKey}" async></script>`;
  site.updatedAt = new Date().toISOString();
  return {
    site: { ...site },
    revealedSiteKey: fullKey,
  };
}

export function sendTestMessage(
  site: SiteConfig,
  request: TestMessageRequest,
): Promise<TestMessageResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const message = request.message.trim();
      if (!message) {
        resolve({ ok: false, code: 400, message: "请输入测试消息。" });
        return;
      }

      if (!isOriginAllowed(request.origin, site.allowedDomains)) {
        resolve({
          ok: false,
          code: 403,
          message: `来源域名“${request.origin}”不在白名单内，Widget 请求会被拒绝。`,
        });
        return;
      }

      resolve({
        ok: true,
        reply: `测试成功，${site.botName} 已收到消息：“${message}”。`,
        latencyMs: 820,
      });
    }, 700);
  });
}
