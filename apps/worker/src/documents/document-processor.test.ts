import * as assert from "node:assert/strict";
import { test } from "node:test";

import { processDocumentJob } from "./document-processor";

test("worker transitions healthy document to ready with chunk count", () => {
  const result = processDocumentJob({
    documentId: "doc_1",
    workspaceId: "ws_1",
    knowledgeBaseId: "kb_1",
    filename: "pricing-guide.pdf",
    sizeBytes: 8192,
    storageKey: "ws_1/kb_1/doc_1-pricing-guide.pdf",
    attempt: 1,
  });

  assert.equal(result.documentId, "doc_1");
  assert.equal(result.workspaceId, "ws_1");
  assert.deepEqual(result.transitions, [
    { status: "uploaded" },
    { status: "parsing" },
    { status: "indexing" },
    { status: "ready", chunkCount: 4 },
  ]);
});

test("worker marks parser failures with failed status", () => {
  const result = processDocumentJob({
    documentId: "doc_2",
    workspaceId: "ws_2",
    knowledgeBaseId: "kb_2",
    filename: "fail-contract.docx",
    sizeBytes: 4096,
    storageKey: "ws_2/kb_2/doc_2-fail-contract.docx",
    attempt: 2,
  });

  assert.equal(result.transitions.at(-1)?.status, "failed");
  assert.equal(
    result.transitions.at(-1)?.errorMessage,
    "Parser could not extract stable sections from the file.",
  );
});
