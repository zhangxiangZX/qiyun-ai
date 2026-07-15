#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = process.env.API_BASE ?? "http://localhost:3001";
const WS = process.env.WORKSPACE_ID ?? "ws_67be000a-c633-46cc-a11c-fd4020baa6ed";
const BOT_ID = process.env.BOT_ID ?? "bot_23870d5a-e503-4ede-9dd2-c19b6f7b4148";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@qiyun.ai";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "Qiyun@2026";

const promptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../knowledge-import/kuzimash-v1/bot-config/系统提示词.md",
);

const WELCOME_MESSAGE =
  "您好，我是库滋玛选型顾问。机柜、机箱、温控、定制方案都可以问，您直接说需求就行。";

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
  const systemPrompt = readFileSync(promptPath, "utf8").trim();
  const login = await api("POST", "/auth/login", {
    body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
  });

  const updated = await api("PATCH", `/bots/${BOT_ID}`, {
    token: login.tokens.accessToken,
    body: {
      systemPrompt,
      welcomeMessage: WELCOME_MESSAGE,
      llmTemperature: 0.55,
    },
  });

  console.log(`Updated bot ${updated.id}`);
  console.log(`  systemPrompt length=${systemPrompt.length}`);
  console.log(`  welcomeMessage=${updated.welcomeMessage}`);
  console.log(`  llmTemperature=${updated.llmTemperature}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
