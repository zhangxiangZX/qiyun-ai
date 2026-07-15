import assert from "node:assert/strict";
import test from "node:test";

import { FileVaultApi } from "./file-vault.api";
import { InMemoryFileVaultRepository } from "./file-vault.repository";

test("text watermark is applied on the server and reports server_text_overlay", () => {
  const repository = new InMemoryFileVaultRepository();
  const api = new FileVaultApi(repository);
  const created = api.uploadFile("ws_demo", {
    fileName: "notes.txt",
    fileType: "text/plain",
    sizeBytes: 11,
    contentBytes: new TextEncoder().encode("hello world"),
    category: "other",
    uploadedBy: "owner",
  });

  const watermarked = api.getWatermarked("ws_demo", created.id, "owner");
  assert.ok(watermarked);
  assert.equal(watermarked.applied, true);
  assert.equal(watermarked.mode, "server_text_overlay");
  const text = new TextDecoder().decode(watermarked.bytes);
  assert.match(text, /notes\.txt/);
  assert.match(text, /hello world/);
});

test("binary watermark reports client_binary_overlay without claiming server stamping", () => {
  const repository = new InMemoryFileVaultRepository();
  const api = new FileVaultApi(repository);
  const created = api.uploadFile("ws_demo", {
    fileName: "drawing.pdf",
    fileType: "application/pdf",
    sizeBytes: 8,
    contentBytes: new Uint8Array([1, 2, 3, 4]),
    category: "quote",
    uploadedBy: "owner",
  });

  const watermarked = api.getWatermarked("ws_demo", created.id, "owner");
  assert.ok(watermarked);
  assert.equal(watermarked.applied, false);
  assert.equal(watermarked.mode, "client_binary_overlay");
  assert.deepEqual([...watermarked.bytes], [1, 2, 3, 4]);
});
