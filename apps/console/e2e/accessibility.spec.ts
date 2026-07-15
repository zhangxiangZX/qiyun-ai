import AxeBuilder from "@axe-core/playwright";
import { test } from "@playwright/test";

import { test as authedTest } from "./fixtures";

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  const diagnostics = blocking.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      summary: node.failureSummary,
    })),
  }));
  if (blocking.length > 0) {
    throw new Error(JSON.stringify(diagnostics, null, 2));
  }
}

test.describe("public accessibility", () => {
  for (const route of ["/login", "/trial", "/legal/privacy-policy", "/legal/user-agreement"]) {
    test(`${route} has no serious WCAG violations`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page);
    });
  }
});

authedTest.describe("console accessibility", () => {
  for (const route of ["/dashboard", "/dashboard/inquiries", "/dashboard/knowledge-bases"]) {
    authedTest(`${route} has no serious WCAG violations`, async ({ authedPage: page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page);
    });
  }
});
