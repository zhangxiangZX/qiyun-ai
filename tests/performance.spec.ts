import { expect, test } from "@playwright/test";

import { loginViaUi, waitForUpstreamMode } from "./helpers/auth";

const PERF_PAGES = [
  { path: "/dashboard", budgetMs: 5000, label: "首页/工作台" },
  { path: "/dashboard/inquiries", budgetMs: 8000, label: "询盘列表" },
  { path: "/dashboard/quotes", budgetMs: 8000, label: "报价列表" },
  { path: "/dashboard/knowledge-bases", budgetMs: 8000, label: "知识库" },
];

test.describe("performance smoke", () => {
  test("关键页加载时长冒烟（非百万级压测）", async ({ page }) => {
    test.info().annotations.push({
      type: "scope",
      description: "百万询盘压测需独立性能环境，本用例仅做本地冒烟预算",
    });
    await loginViaUi(page);
    await waitForUpstreamMode(page);

    for (const item of PERF_PAGES) {
      const start = Date.now();
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: item.budgetMs }).catch(() => undefined);
      const elapsed = Date.now() - start;
      expect(elapsed, `${item.label} ${elapsed}ms > ${item.budgetMs}ms`).toBeLessThan(item.budgetMs);
    }
  });
});
