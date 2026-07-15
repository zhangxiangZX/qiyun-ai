import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkStructuredText,
  estimateTokenCount,
  normalizeWhitespace,
  removeRepeatedNoiseLines,
} from "./document-chunking";

test("normalizeWhitespace collapses excessive blank lines", () => {
  const input = "  hello \n\n\n\nworld  ";
  assert.equal(normalizeWhitespace(input), "hello\n\nworld");
});

test("removeRepeatedNoiseLines drops repeated short headers", () => {
  const input = [
    "Page 1",
    "正文内容 A",
    "Page 1",
    "正文内容 B",
    "Page 1",
    "Page 1",
    "正文内容 C",
  ].join("\n");

  const cleaned = removeRepeatedNoiseLines(input);
  assert.match(cleaned, /正文内容 A/);
  assert.doesNotMatch(cleaned, /Page 1/);
});

test("chunkStructuredText splits markdown by headings", () => {
  const chunks = chunkStructuredText({
    fileName: "guide.md",
    text: "# 标题一\n内容 A\n\n## 标题二\n内容 B",
  });

  assert.ok(chunks.some((chunk) => chunk.sectionTitle === "标题一" && chunk.content.includes("内容 A")));
  assert.ok(chunks.some((chunk) => chunk.sectionTitle === "标题二" && chunk.content.includes("内容 B")));
});

test("chunkStructuredText keeps overlap between long sections", () => {
  const text = "A".repeat(700) + " BRIDGE " + "B".repeat(700);
  const chunks = chunkStructuredText({
    fileName: "long.txt",
    text,
    maxChars: 400,
    overlapChars: 50,
  });

  assert.ok(chunks.length >= 2);
  const combined = chunks.map((chunk) => chunk.content).join(" ");
  assert.match(combined, /BRIDGE/);
});

test("estimateTokenCount returns positive counts for mixed scripts", () => {
  const cjk = estimateTokenCount("机柜系列选型手册内容说明");
  const latin = estimateTokenCount("cabinet selection guide notes");
  assert.ok(cjk > 0);
  assert.ok(latin > 0);
});
