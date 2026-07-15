#!/usr/bin/env node
/**
 * Rotate Kuzimash site key and print embed snippet.
 */
const API = process.env.API_BASE ?? "http://localhost:3001";
const WS = process.env.WORKSPACE_ID ?? "ws_67be000a-c633-46cc-a11c-fd4020baa6ed";
const BOT_ID = process.env.BOT_ID ?? "bot_23870d5a-e503-4ede-9dd2-c19b6f7b4148";
const SITE_ID = process.env.SITE_ID ?? "site_86678430-bc4f-41d1-beea-00008df4db91";
const WIDGET_VERSION = process.env.WIDGET_VERSION ?? "5";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@qiyun.ai";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "Qiyun@2026";
const DOMAINS = (process.env.ALLOWED_DOMAINS ??
  "localhost,127.0.0.1,192.168.5.10,192.168.,kuzimash").split(",").map((d) => d.trim()).filter(Boolean);

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(token ? { "x-workspace-id": WS } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  const parsed = text ? JSON.parse(text) : null;
  return parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
}

async function main() {
  const login = await api("POST", "/auth/login", {
    body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
  });
  const token = login.tokens.accessToken;

  const patched = await api("PATCH", `/sites/${SITE_ID}`, {
    token,
    body: { allowedDomains: DOMAINS },
  });

  const rotated = await api("POST", `/sites/${SITE_ID}/rotate-key`, { token });
  const siteKey = rotated.revealedSiteKey;

  console.log("Site updated:");
  console.log(`  id: ${patched.id}`);
  console.log(`  botId: ${patched.botId}`);
  console.log(`  allowedDomains: ${JSON.stringify(patched.allowedDomains)}`);
  console.log(`  siteKeyPrefix: ${patched.siteKeyPrefix}`);
  console.log("");
  console.log("Full siteKey (copy once, store safely):");
  console.log(siteKey);
  console.log("");
  console.log("Embed snippet:");
  console.log(`<script
  src="${API}/public/widget.js?v=${WIDGET_VERSION}"
  data-api-base="${API}"
  data-bot-id="${BOT_ID}"
  data-site-key="${siteKey}"
  async
></script>`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
