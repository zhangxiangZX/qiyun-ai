import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeContextBlock,
  sanitizeVisitorFacingReply,
} from "./visitor-reply-sanitize";

test("sanitizeVisitorFacingReply removes reference source sections", () => {
  const input = [
    "库滋玛提供机柜、机箱、操作台等产品。",
    "",
    "参考来源：",
    "- [05_资料下载与来源索引.md]",
    "- About54a8.html",
  ].join("\n");

  const output = sanitizeVisitorFacingReply(input);
  assert.match(output, /库滋玛提供机柜/);
  assert.doesNotMatch(output, /参考来源/);
  assert.doesNotMatch(output, /About54a8/);
});

test("sanitizeVisitorFacingReply replaces internal old-site wording", () => {
  const output = sanitizeVisitorFacingReply(
    "旧站资料下载页列出了机柜选型手册，旧站下载链接未在离线包中成功抓取。",
  );

  assert.doesNotMatch(output, /旧站/);
  assert.doesNotMatch(output, /离线包/);
  assert.doesNotMatch(output, /下载页/);
  assert.match(output, /官网资料/);
});

test("sanitizeVisitorFacingReply removes important notice and meta intro", () => {
  const output = sanitizeVisitorFacingReply(
    [
      "根据官网资料，库滋玛的联系方式如下：",
      "- 总机：0512-57128257",
      "",
      "**重要提示：** 以上联系方式来自官网资料，建议您在联系前确认其仍有效。",
    ].join("\n"),
  );

  assert.doesNotMatch(output, /重要提示/);
  assert.doesNotMatch(output, /根据官网资料/);
  assert.doesNotMatch(output, /联系前确认/);
  assert.match(output, /0512-57128257/);
});

test("sanitizeContextBlock cleans retrieval snippets before prompting", () => {
  const output = sanitizeContextBlock(
    "[05_资料下载与来源索引.md#chunk_1] 旧站 About54a8.html 列示资料下载列表。",
  );

  assert.doesNotMatch(output, /旧站/);
  assert.doesNotMatch(output, /About54a8/);
});

test("sanitizeVisitorFacingReply softens salt-spray guarantee language", () => {
  const output = sanitizeVisitorFacingReply(
    "这类项目我们一般可以保证盐雾1000小时，但具体是否能达到1000小时还要看材料和表面处理。",
  );

  assert.doesNotMatch(output, /可以保证/);
  assert.doesNotMatch(output, /1000小时/);
  assert.match(output, /是否能达到|工程师确认/);
  assert.match(output, /目标耐盐雾时长/);
});
