import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyBotDetailFetch,
  resolveBotEditShellView,
} from "@/lib/bots/edit-load-state";

test("resolveBotEditShellView mirrors bot load states", () => {
  assert.equal(resolveBotEditShellView("loading"), "loading");
  assert.equal(resolveBotEditShellView("not_found"), "not_found");
  assert.equal(resolveBotEditShellView("error"), "error");
  assert.equal(resolveBotEditShellView("ready"), "ready");
});

test("classifyBotDetailFetch distinguishes not found from load error", () => {
  assert.equal(classifyBotDetailFetch({ id: "bot_1" }, null), "ready");
  assert.equal(classifyBotDetailFetch(null, null), "not_found");
  assert.equal(classifyBotDetailFetch(null, new Error("network")), "error");
});
