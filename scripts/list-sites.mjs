#!/usr/bin/env node
const API = process.env.API_BASE ?? "http://localhost:3001";
const WS = process.env.WORKSPACE_ID ?? "ws_67be000a-c633-46cc-a11c-fd4020baa6ed";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@qiyun.ai";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "Qiyun@2026";

async function main() {
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
  }).then((r) => r.json());
  const loginData = login?.data ?? login;

  const headers = {
    authorization: `Bearer ${loginData.tokens.accessToken}`,
    "x-workspace-id": WS,
  };

  const sitesResponse = await fetch(`${API}/sites`, { headers }).then((r) => r.json());
  const botsResponse = await fetch(`${API}/bots`, { headers }).then((r) => r.json());
  const sites = sitesResponse?.data ?? sitesResponse;
  const bots = botsResponse?.data ?? botsResponse;

  console.log("Sites:");
  for (const site of sites) {
    console.log(
      JSON.stringify({
        id: site.id,
        botId: site.botId,
        name: site.name,
        status: site.status,
        allowedDomains: site.allowedDomains,
        siteKeyPrefix: site.siteKeyPrefix,
      }),
    );
  }

  console.log("\nBots:");
  for (const bot of bots) {
    console.log(JSON.stringify({ id: bot.id, name: bot.name, status: bot.status }));
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
