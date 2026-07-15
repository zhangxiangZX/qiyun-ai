import assert from "node:assert/strict";
import test from "node:test";

import { formatDeleteDocumentSuccessMessage } from "./delete-result.js";

test("formatDeleteDocumentSuccessMessage includes chunk count", () => {
  const message = formatDeleteDocumentSuccessMessage("manual.pdf", {
    id: "doc_1",
    knowledgeBaseId: "kb_1",
    deletedAt: "2026-01-01T00:00:00.000Z",
    removedChunkCount: 12,
    storageAction: "deleted",
    archivedStorageKey: null,
  });
  assert.match(message, /manual\.pdf/);
  assert.match(message, /12 条索引片段/);
  assert.doesNotMatch(message, /归档/);
});

test("formatDeleteDocumentSuccessMessage mentions archive", () => {
  const message = formatDeleteDocumentSuccessMessage("spec.pdf", {
    id: "doc_2",
    knowledgeBaseId: "kb_1",
    deletedAt: "2026-01-01T00:00:00.000Z",
    removedChunkCount: 3,
    storageAction: "archived",
    archivedStorageKey: "archive/spec.pdf",
  });
  assert.match(message, /原文件已归档保存/);
});
