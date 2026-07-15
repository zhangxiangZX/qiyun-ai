import test from "node:test";
import assert from "node:assert/strict";

import { renderMarkdownToHtml } from "./render-markdown";

test("renderMarkdownToHtml renders intro plus bullet list in one block", () => {
  const html = renderMarkdownToHtml(
    "您好，联系方式如下：\n- **总机：** 0512-57128257\n- **邮箱：** test@example.com",
  );

  assert.match(html, /<p>您好，联系方式如下：<\/p>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<strong>总机：<\/strong>/);
});

test("renderMarkdownToHtml formats standalone lists and bold text", () => {
  const html = renderMarkdownToHtml(
    ["**产品范围**", "", "- 机柜系列", "- 温控系列"].join("\n"),
  );

  assert.match(html, /<strong>产品范围<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>机柜系列<\/li>/);
});

test("renderMarkdownToHtml escapes raw html", () => {
  const html = renderMarkdownToHtml('<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
