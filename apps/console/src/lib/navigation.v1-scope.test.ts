import assert from "node:assert/strict";
import test from "node:test";

import { workspaceNavigationGroups } from "@/lib/navigation";

function sidebarTitles(): string[] {
  return workspaceNavigationGroups.flatMap((group) => [
    group.title,
    ...(group.children ?? []).map((child) => child.title),
  ]);
}

function sidebarChildTitles(): string[] {
  return workspaceNavigationGroups.flatMap((group) =>
    (group.children ?? []).map((child) => child.title),
  );
}

test("V1 sidebar excludes V2 / prototype-only titles", () => {
  const titles = sidebarTitles();
  for (const forbidden of ["弹窗测试", "提交成功", "套餐与账单", "成交漏斗"]) {
    assert.ok(!titles.includes(forbidden), `sidebar must not include ${forbidden}`);
  }
});

test("V1 sidebar includes delivery-scope entries", () => {
  const titles = sidebarChildTitles();
  for (const required of ["快速录入", "二维码管理", "询盘中心", "知识库"]) {
    assert.ok(titles.includes(required), `sidebar must include ${required}`);
  }
});

test("workspace group children are only role homes", () => {
  const workspace = workspaceNavigationGroups.find((group) => group.id === "workspace");
  assert.ok(workspace);
  assert.deepEqual(
    (workspace.children ?? []).map((child) => child.id),
    ["boss-home", "admin-home", "sales-rep-home"],
  );
});
