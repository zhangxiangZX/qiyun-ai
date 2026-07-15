import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getTenantContext,
  isTenantBypass,
  enterWithTenant,
  runWithBypassRls,
  runWithTenant,
  TENANT_BYPASS_SENTINEL,
} from "./tenant-context";

test("tenant-context: 默认无上下文", () => {
  assert.equal(getTenantContext(), null);
  assert.equal(isTenantBypass(), false);
});

test("tenant-context: enterWithTenant 设置并在后续 continuation 可读", async () => {
  assert.equal(getTenantContext(), null);
  await new Promise<void>((resolve) => {
    enterWithTenant("ws_abc");
    // 模拟后续异步调用读取上下文
    setImmediate(() => {
      assert.equal(getTenantContext(), "ws_abc");
      assert.equal(isTenantBypass(), false);
      resolve();
    });
  });
});

test("tenant-context: runWithBypassRls 内部为旁路且结束后恢复", async () => {
  enterWithTenant("ws_normal");
  const inner = await runWithBypassRls(async () => {
    assert.equal(getTenantContext(), TENANT_BYPASS_SENTINEL);
    assert.equal(isTenantBypass(), true);
    return "done";
  });
  assert.equal(inner, "done");
  // 结束后恢复外层上下文
  assert.equal(getTenantContext(), "ws_normal");
  assert.equal(isTenantBypass(), false);
});

test("tenant-context: runWithTenant 内部为指定 workspace 且结束后恢复", async () => {
  enterWithTenant("ws_outer");
  const inner = await runWithTenant("ws_inner", async () => {
    assert.equal(getTenantContext(), "ws_inner");
    assert.equal(isTenantBypass(), false);
    return "ok";
  });
  assert.equal(inner, "ok");
  assert.equal(getTenantContext(), "ws_outer");
});

test("tenant-context: runWithTenant 在全新上下文也能正确恢复为无上下文", async () => {
  assert.equal(getTenantContext(), null);
  const inner = await runWithTenant("ws_x", async () => getTenantContext());
  assert.equal(inner, "ws_x");
  assert.equal(getTenantContext(), null);
});
