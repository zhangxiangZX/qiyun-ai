import assert from "node:assert/strict";
import test from "node:test";

import { formatAttachmentSize, validateLeadAttachmentFile } from "./lead-attachments-api";

test("formatAttachmentSize renders human readable units", () => {
  assert.equal(formatAttachmentSize(512), "512 B");
  assert.equal(formatAttachmentSize(2048), "2.0 KB");
  assert.equal(formatAttachmentSize(5 * 1024 * 1024), "5.0 MB");
});

test("validateLeadAttachmentFile rejects oversized files", () => {
  assert.equal(validateLeadAttachmentFile({ size: 1024 } as File), null);
  assert.match(
    validateLeadAttachmentFile({ size: 11 * 1024 * 1024 } as File) ?? "",
    /不能超过/,
  );
});
