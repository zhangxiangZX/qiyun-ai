#!/usr/bin/env node
/**
 * Clean duplicate Kuzimash KB documents and update bot system prompt.
 */
import fs from "node:fs";
import path from "node:path";

const API_BASE = process.env.API_BASE ?? "http://localhost:3001";
const EMAIL = process.env.EMAIL ?? "owner@qiyun.ai";
const PASSWORD = process.env.PASSWORD ?? "Qiyun@2026";
const WORKSPACE_ID = process.env.WORKSPACE_ID ?? "ws_67be000a-c633-46cc-a11c-fd4020baa6ed";
const KB_ID = process.env.KB_ID ?? "kb_bcbbafdf-d4e6-43c5-b1c1-47a2d6c6a78d";
const BOT_ID = process.env.BOT_ID ?? "bot_23870d5a-e503-4ede-9dd2-c19b6f7b4148";
const PROMPT_PATH =
  process.env.PROMPT_PATH ??
  path.join("knowledge-import", "kuzimash-v1", "bot-config", "系统提示词.md");

async function api(method, apiPath, { token, body } = {}) {
  const headers = {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(token ? { "x-workspace-id": WORKSPACE_ID } : {}),
    ...(body ? { "content-type": "application/json; charset=utf-8" } : {}),
  };
  const res = await fetch(`${API_BASE}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${apiPath} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  const parsed = await res.json();
  return parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
}

function loadSystemPrompt() {
  const raw = fs.readFileSync(PROMPT_PATH, "utf8");
  return raw.replace(/^#\s*库滋玛产品选型助手｜系统提示词\s*\n/, "").trim();
}

async function main() {
  console.log("Logging in...");
  const login = await api("POST", "/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  const token = login.tokens.accessToken;

  console.log("Fetching documents...");
  const docs = await api("GET", `/knowledge-bases/${KB_ID}/documents`, { token });

  const toDelete = new Set();

  const byName = new Map();
  for (const doc of docs) {
    const list = byName.get(doc.fileName) ?? [];
    list.push(doc);
    byName.set(doc.fileName, list);
  }

  for (const [fileName, group] of byName) {
    group.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    for (const doc of group.slice(1)) {
      toDelete.add(doc.id);
      console.log(`  duplicate: ${fileName} -> delete ${doc.id}`);
    }
  }

  for (const doc of docs) {
    if (/06_.*提示词/.test(doc.fileName) || /\.pdf\.txt$/.test(doc.fileName)) {
      if (!toDelete.has(doc.id)) {
        toDelete.add(doc.id);
        console.log(`  exclude: ${doc.fileName} -> delete ${doc.id}`);
      }
    }
  }

  console.log(`Deleting ${toDelete.size} document(s)...`);
  for (const id of toDelete) {
    await api("DELETE", `/documents/${id}`, { token });
    console.log(`  deleted ${id}`);
  }

  console.log("Updating bot system prompt...");
  const patched = await api("PATCH", `/bots/${BOT_ID}`, {
    token,
    body: {
      systemPrompt: loadSystemPrompt(),
      welcomeMessage:
        "您好，我是库滋玛产品选型助手。可帮您了解机柜、机箱、操作台、悬臂、温控等产品选型，有什么可以帮您？",
      recommendedQuestions: [
        "你们主要做什么产品？",
        "户外机柜怎么选？",
        "有操作台和悬臂系统吗？",
        "机柜空调和温控怎么选？",
      ],
    },
  });
  console.log(`Bot updated. Prompt length: ${patched.systemPrompt.length} chars`);

  const remaining = await api("GET", `/knowledge-bases/${KB_ID}/documents`, { token });
  console.log(`Remaining documents: ${remaining.length}`);
  for (const doc of remaining.sort((a, b) => a.fileName.localeCompare(b.fileName, "zh"))) {
    console.log(`  ${doc.status} - ${doc.fileName}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
