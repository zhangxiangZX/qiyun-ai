import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getActiveNavItem } from "./navigation";

describe("getActiveNavItem quote routes", () => {
  it("labels quote detail as 报价详情, not PDF预览", () => {
    const active = getActiveNavItem("/dashboard/quotes/qo_abc123");
    assert.equal(active?.title, "报价详情");
  });

  it("labels quote preview as PDF预览", () => {
    const active = getActiveNavItem("/dashboard/quotes/qo_abc123/preview");
    assert.equal(active?.title, "PDF预览");
  });

  it("labels customer quote page correctly", () => {
    const active = getActiveNavItem("/dashboard/quotes/qo_abc123/customer");
    assert.equal(active?.title, "客户报价页");
  });

  it("keeps template preview under template editing", () => {
    const active = getActiveNavItem("/dashboard/quotes/templates/tpl_1/preview");
    assert.equal(active?.title, "报价模板编辑");
  });

  it("labels new quote page as 新建报价", () => {
    const active = getActiveNavItem("/dashboard/quotes/new");
    assert.equal(active?.title, "新建报价");
  });
});
