import test from "node:test";
import assert from "node:assert/strict";

import {
  enrichAuditEntry,
  formatAuditSummary,
  getAuditActionLabel,
  getAuditModuleLabel,
} from "./audit-labels";

test("audit labels format readable summaries", () => {
  assert.equal(getAuditModuleLabel("inquiry"), "询盘");
  assert.equal(getAuditModuleLabel("quote_template"), "报价模板");
  assert.equal(getAuditActionLabel("public_link_rotate"), "生成公开链接");
  assert.equal(
    formatAuditSummary("inquiry", "assign", { ownerId: "user_sales_007" }),
    "询盘 · 分配（负责人：user_sales_007）",
  );
});

test("enrichAuditEntry adds view fields", () => {
  const enriched = enrichAuditEntry({
    id: "audit_1",
    workspaceId: "ws_1",
    userId: "user_1",
    module: "quote",
    action: "send",
    targetId: "qopp_1",
    ip: null,
    detail: { quotedAmount: 12800 },
    createdAt: new Date().toISOString(),
  });
  assert.equal(enriched.moduleLabel, "报价");
  assert.equal(enriched.actionLabel, "发送");
  assert.match(enriched.summary, /报价 · 发送/);
});
