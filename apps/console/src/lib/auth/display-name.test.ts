import assert from "node:assert/strict";
import test from "node:test";

import { formatUserDisplayName, isCorruptedDisplayName } from "./display-name";

test("isCorruptedDisplayName detects placeholder question marks", () => {
  assert.equal(isCorruptedDisplayName("?????"), true);
  assert.equal(isCorruptedDisplayName("企业管理员"), false);
});

test("formatUserDisplayName falls back to email local part", () => {
  assert.equal(
    formatUserDisplayName({ name: "?????", email: "owner@qiyun.ai" }),
    "owner",
  );
});

test("formatUserDisplayName keeps valid Chinese names", () => {
  assert.equal(
    formatUserDisplayName({ name: "张三", email: "zhang@example.com" }),
    "张三",
  );
});
