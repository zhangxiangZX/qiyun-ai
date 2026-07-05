import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalyticsFootnote,
  getBotsReadOnlyNotice,
  getDataModeBannerPresentation,
  getModeBadgeLabel,
  getSaveSuccessMessage,
} from "./mode-copy";

test("getModeBadgeLabel returns consistent preview/upstream labels", () => {
  assert.match(getModeBadgeLabel("preview"), /演示/);
  assert.match(getModeBadgeLabel("upstream"), /正式 API/);
});

test("getDataModeBannerPresentation includes feature hint in preview mode", () => {
  const presentation = getDataModeBannerPresentation("preview", "线索");
  assert.equal(presentation.variant, "warning");
  assert.match(presentation.body, /线索：/);
  assert.match(presentation.body, /演示数据/);
});

test("getDataModeBannerPresentation uses upstream hint in live mode", () => {
  const presentation = getDataModeBannerPresentation("upstream", "线索");
  assert.equal(presentation.variant, "success");
  assert.match(presentation.body, /apps\/api/);
});

test("getSaveSuccessMessage never claims upstream write in preview mode", () => {
  const previewLead = getSaveSuccessMessage("preview", "lead");
  const upstreamLead = getSaveSuccessMessage("upstream", "lead");

  assert.match(previewLead, /演示数据/);
  assert.doesNotMatch(previewLead, /已保存至 apps\/api/);
  assert.match(upstreamLead, /apps\/api/);
});

test("getAnalyticsFootnote distinguishes dashboard demo vs live copy", () => {
  const preview = getAnalyticsFootnote("dashboard", "preview");
  const upstream = getAnalyticsFootnote("dashboard", "upstream");

  assert.match(preview.body, /演示/);
  assert.match(upstream.body, /apps\/api/);
});

test("getBotsReadOnlyNotice states preview is browse-only", () => {
  assert.match(getBotsReadOnlyNotice("list"), /仅供浏览/);
  assert.doesNotMatch(getBotsReadOnlyNotice("list"), /可创建与编辑/);
});
