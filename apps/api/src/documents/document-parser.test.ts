import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";

import {
  NoExtractableTextError,
  parseDocumentContent,
  UnsupportedDocumentTypeError,
} from "./document-parser";

function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function createPdfWithFlateText(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const compressed = deflateRawSync(Buffer.from(stream, "utf8"));
  const header =
    `%PDF-1.4\n1 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`;
  const footer = `\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from(header, "utf8"),
      compressed,
      Buffer.from(footer, "utf8"),
    ]),
  );
}

function createStoredZip(entries: Array<{ name: string; content: string }>): Uint8Array {
  const parts: Buffer[] = [];

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.content, "utf8");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(0, 10);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(content.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    parts.push(header, name, content);
  }

  return new Uint8Array(Buffer.concat(parts));
}

test("parseDocumentContent extracts text from flate-compressed PDF streams", () => {
  const chunks = parseDocumentContent({
    fileName: "spec.pdf",
    fileType: "application/pdf",
    sizeBytes: 120,
    contentBytes: createPdfWithFlateText("Industrial Pump Manual"),
  });

  assert.equal(chunks.length, 1);
  assert.match(chunks[0]?.content ?? "", /Industrial Pump Manual/);
});

test("parseDocumentContent extracts paragraph-aware text from DOCX xml", () => {
  const docx = createStoredZip([
    {
      name: "word/document.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8"?><w:document><w:body><w:p><w:r><w:t>First paragraph</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>',
    },
  ]);

  const chunks = parseDocumentContent({
    fileName: "manual.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: docx.byteLength,
    contentBytes: docx,
  });

  assert.equal(chunks.length, 1);
  assert.match(chunks[0]?.content ?? "", /First paragraph/);
  assert.match(chunks[0]?.content ?? "", /Second paragraph/);
});

test("parseDocumentContent rejects unsupported document types", () => {
  assert.throws(
    () =>
      parseDocumentContent({
        fileName: "sheet.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: 10,
        contentBytes: toBytes("ignored"),
      }),
    UnsupportedDocumentTypeError,
  );
});

test("parseDocumentContent rejects empty extractable payloads", () => {
  assert.throws(
    () =>
      parseDocumentContent({
        fileName: "empty.txt",
        fileType: "text/plain",
        sizeBytes: 0,
        contentBytes: toBytes("   "),
      }),
    NoExtractableTextError,
  );
});
