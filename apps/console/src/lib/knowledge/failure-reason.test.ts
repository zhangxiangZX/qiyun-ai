import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyDocumentFailure,
  DOCUMENT_ERROR_CODE_COPY,
  FAILURE_CATEGORY_LABELS,
} from "./failure-reason.js";

test("classifyDocumentFailure prefers errorCode over message", () => {
  const insight = classifyDocumentFailure({
    errorCode: "unsupported_file_type",
    errorMessage: "Parser could not extract stable sections from the file.",
  });
  assert.equal(insight.title, DOCUMENT_ERROR_CODE_COPY.unsupported_file_type.title);
  assert.equal(insight.retryable, false);
  assert.equal(insight.technicalDetail, "Parser could not extract stable sections from the file.");
});

test("classifyDocumentFailure maps parser_unstable_sections", () => {
  const insight = classifyDocumentFailure({
    errorCode: "parser_unstable_sections",
    errorMessage: "internal detail",
  });
  assert.equal(insight.title, "解析结构不稳定");
  assert.equal(insight.retryable, true);
});

test("classifyDocumentFailure detects format unsupported from message fallback", () => {
  const insight = classifyDocumentFailure("仅支持 pdf、docx、txt 格式。", "exe");
  assert.equal(insight.category, "format_unsupported");
  assert.equal(insight.retryable, false);
});

test("classifyDocumentFailure detects no extractable text from message fallback", () => {
  const insight = classifyDocumentFailure(
    "Parser could not extract stable sections from the file.",
  );
  assert.equal(insight.category, "no_extractable_text");
  assert.equal(insight.retryable, true);
});

test("classifyDocumentFailure unknown errors are retryable", () => {
  const insight = classifyDocumentFailure("Something unexpected happened.");
  assert.equal(insight.category, "unknown");
  assert.equal(insight.title, "未知错误");
  assert.equal(insight.retryable, true);
});

test("classifyDocumentFailure empty message falls back to unknown retryable", () => {
  const insight = classifyDocumentFailure(null);
  assert.equal(insight.category, "unknown");
  assert.equal(insight.retryable, true);
});

test("FAILURE_CATEGORY_LABELS covers all categories", () => {
  assert.equal(FAILURE_CATEGORY_LABELS.format_unsupported, "格式不支持");
  assert.equal(FAILURE_CATEGORY_LABELS.processing_failed, "处理失败");
  assert.equal(FAILURE_CATEGORY_LABELS.parser_unstable, "解析不稳定");
});
