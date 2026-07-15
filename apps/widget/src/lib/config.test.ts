import assert from "node:assert/strict";
import test from "node:test";

import { parseWidgetConfig, resolveApiBase, validateWidgetConfig } from "./config";
import { parseSseChunk } from "./sse-client";

function mockScript(attrs: Record<string, string>, src = ""): HTMLScriptElement {
  return {
    src,
    getAttribute(name: string) {
      return attrs[name] ?? null;
    },
  } as HTMLScriptElement;
}

test("parseWidgetConfig reads script attributes", () => {
  const config = parseWidgetConfig(
    mockScript({
      "data-bot-id": "bot_1",
      "data-site-key": "pk_1",
      "data-api-base": "http://localhost:3001/",
      "data-title": "测试客服",
      "data-theme": "green",
    }),
  );
  assert.ok(config);
  assert.equal(config.botId, "bot_1");
  assert.equal(config.siteKey, "pk_1");
  assert.equal(config.apiBase, "http://localhost:3001");
  assert.equal(config.title, "测试客服");
  assert.equal(config.accent, "#059669");
});

test("validateWidgetConfig rejects incomplete config", () => {
  assert.equal(validateWidgetConfig(null), false);
  assert.equal(
    validateWidgetConfig({
      botId: "",
      siteKey: "pk",
      apiBase: "http://localhost:3001",
      title: "t",
      welcome: "w",
      accent: "#000",
      locale: "zh-CN",
    }),
    false,
  );
});

test("resolveApiBase falls back to script origin", () => {
  assert.equal(
    resolveApiBase(mockScript({}, "https://cdn.example.com/public/widget.js")),
    "https://cdn.example.com",
  );
});

test("parseSseChunk emits parsed events and keeps remainder", () => {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  const remainder = parseSseChunk(
    'event: meta\ndata: {"conversationId":"c_1"}\n\nevent: token\ndata: {"text":"你"}\n\n',
    (event) => events.push(event),
  );

  assert.equal(events.length, 2);
  assert.equal(events[0]?.event, "meta");
  assert.equal(events[0]?.data.conversationId, "c_1");
  assert.equal(events[1]?.data.text, "你");
  assert.equal(remainder, "");
});
