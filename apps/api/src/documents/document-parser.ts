import { inflateRawSync } from "node:zlib";

import {
  chunkStructuredText,
  normalizeWhitespace,
  stripHtmlToText,
} from "./document-chunking";
import type { ParsedDocumentChunk } from "./document.types";

export class DocumentParseError extends Error {}
export class UnsupportedDocumentTypeError extends DocumentParseError {}
export class NoExtractableTextError extends DocumentParseError {}

function toUtf8(input: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(input);
}

function hasSupportedTextExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".markdown");
}

function hasSupportedHtmlExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".html") || lower.endsWith(".htm");
}

function hasSupportedPdfExtension(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

function hasSupportedDocxExtension(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".docx");
}

function decodePdfEscapes(value: string): string {
  return value.replace(/\\([nrtbf()\\])/g, (_, token: string) => {
    switch (token) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "(":
      case ")":
      case "\\":
        return token;
      default:
        return token;
    }
  });
}

function decodePdfByteString(value: string): string {
  return Buffer.from(value, "latin1").toString("utf8");
}

function readPdfLiteralString(input: string, startIndex: number): {
  value: string;
  endIndex: number;
} | null {
  if (input[startIndex] !== "(") {
    return null;
  }

  let depth = 0;
  let escaped = false;
  let output = "";

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];
    if (index === startIndex) {
      depth = 1;
      continue;
    }

    if (!char) {
      break;
    }

    if (escaped) {
      output += `\\${char}`;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "(") {
      depth += 1;
      output += char;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: decodePdfEscapes(output),
          endIndex: index,
        };
      }
      output += char;
      continue;
    }

    output += char;
  }

  return null;
}

function decodePdfHexString(value: string): string {
  const normalized = value.replace(/\s+/g, "");
  if (!normalized) {
    return "";
  }

  const evenLength = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  try {
    return Buffer.from(evenLength, "hex").toString("utf8");
  } catch {
    return "";
  }
}

function extractPdfTextOperators(source: string): string[] {
  const fragments: string[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") {
      const literal = readPdfLiteralString(source, index);
      if (literal) {
        const tail = source.slice(literal.endIndex + 1, literal.endIndex + 6);
        if (/\bTj\b|\bTJ\b|["']/.test(tail)) {
          fragments.push(literal.value);
        }
        index = literal.endIndex;
      }
      continue;
    }

    if (char === "<") {
      const end = source.indexOf(">", index + 1);
      if (end > index + 1) {
        const decoded = decodePdfHexString(source.slice(index + 1, end));
        const tail = source.slice(end + 1, end + 6);
        if (decoded && (/\bTj\b|\bTJ\b/.test(tail) || /[A-Za-z\u4e00-\u9fff]/.test(decoded))) {
          fragments.push(decoded);
        }
        index = end;
      }
    }
  }

  return fragments;
}

function inflatePdfStreams(raw: string): string[] {
  const streams: string[] = [];
  const bytes = Buffer.from(raw, "binary");
  let offset = 0;

  while (offset < bytes.length) {
    const streamIndex = raw.indexOf("stream", offset);
    if (streamIndex < 0) {
      break;
    }

    const dictStart = raw.lastIndexOf("<<", streamIndex);
    const dictEnd = raw.indexOf(">>", dictStart);
    const endStreamIndex = raw.indexOf("endstream", streamIndex);
    if (dictStart < 0 || dictEnd < 0 || endStreamIndex < 0) {
      offset = streamIndex + 6;
      continue;
    }

    const dict = raw.slice(dictStart, dictEnd + 2);
    const streamStart = streamIndex + 6 + (raw[streamIndex + 6] === "\r" && raw[streamIndex + 7] === "\n" ? 2 : 1);
    const streamEnd = endStreamIndex - (raw[endStreamIndex - 1] === "\n" ? 1 : 0);
    const streamBuffer = bytes.subarray(streamStart, Math.max(streamStart, streamEnd));

    if (/FlateDecode/i.test(dict)) {
      try {
        streams.push(inflateRawSync(streamBuffer).toString("utf8"));
      } catch {
        // ignore damaged streams and fall back to raw extraction
      }
    } else {
      streams.push(streamBuffer.toString("utf8"));
    }

    offset = endStreamIndex + 9;
  }

  return streams;
}

function extractPdfText(contentBytes: Uint8Array): string {
  const raw = Buffer.from(contentBytes).toString("latin1");
  const directMatches = [...raw.matchAll(/\(([^()\\]{2,})\)/g)]
    .map((match) => decodePdfByteString(match[1]?.replace(/\\n/g, "\n").replace(/\\r/g, "\r") ?? ""));
  const directHexMatches = [...raw.matchAll(/<([0-9A-Fa-f\s]{4,})>/g)]
    .map((match) => decodePdfHexString(match[1] ?? ""));
  const inflatedMatches = inflatePdfStreams(raw).flatMap((stream) => extractPdfTextOperators(stream));

  const matches = [...directMatches, ...directHexMatches, ...inflatedMatches]
    .map((value) => normalizeWhitespace(value))
    .filter((value) => /[A-Za-z\u4e00-\u9fff]/.test(value));

  return normalizeWhitespace(matches.join("\n"));
}

function readZipEntries(contentBytes: Uint8Array): Map<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>();
  const view = new DataView(
    contentBytes.buffer,
    contentBytes.byteOffset,
    contentBytes.byteLength,
  );
  let offset = 0;

  while (offset + 30 <= contentBytes.byteLength) {
    if (view.getUint32(offset, true) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const fileNameOffset = offset + 30;
    const fileName = Buffer.from(
      contentBytes.slice(fileNameOffset, fileNameOffset + fileNameLength),
    ).toString("utf8");
    const dataOffset = fileNameOffset + fileNameLength + extraLength;
    const compressed = contentBytes.slice(dataOffset, dataOffset + compressedSize);

    let output: Uint8Array;
    if (compressionMethod === 0) {
      output = compressed;
    } else if (compressionMethod === 8) {
      output = new Uint8Array(inflateRawSync(Buffer.from(compressed)));
    } else {
      offset = dataOffset + compressedSize;
      continue;
    }

    entries.set(fileName, output);
    offset = dataOffset + compressedSize;
  }

  return entries;
}

function stripXmlTags(value: string): string {
  return value
    .replace(/<\/w:p>/g, "\n\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ");
}

function extractDocxText(contentBytes: Uint8Array): string {
  const entries = readZipEntries(contentBytes);
  const xmlSources = [
    entries.get("word/document.xml"),
    ...[...entries.entries()]
      .filter(([name]) => /^word\/header\d+\.xml$/i.test(name))
      .map(([, bytes]) => bytes),
    ...[...entries.entries()]
      .filter(([name]) => /^word\/footer\d+\.xml$/i.test(name))
      .map(([, bytes]) => bytes),
  ]
    .filter((bytes): bytes is Uint8Array => Boolean(bytes))
    .map((bytes) => toUtf8(bytes))
    .join("\n");

  const fromTags = [...xmlSources.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g)].map(
    (match) => match[1] ?? "",
  );
  if (fromTags.length > 0) {
    const paragraphAware = normalizeWhitespace(stripXmlTags(xmlSources));
    if (paragraphAware) {
      return paragraphAware;
    }
    return normalizeWhitespace(fromTags.join(" "));
  }

  const raw = normalizeWhitespace(xmlSources) || toUtf8(contentBytes);
  const plainMatches = [...raw.matchAll(/[A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff ,.;:%\-()]{8,}/g)]
    .map((match) => match[0] ?? "")
    .slice(0, 200);

  return normalizeWhitespace(plainMatches.join("\n"));
}

function assignChunkIndexes(chunks: ParsedDocumentChunk[]): ParsedDocumentChunk[] {
  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
  }));
}

export function parseDocumentContent(input: {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  contentBytes: Uint8Array;
}): ParsedDocumentChunk[] {
  const fileName = input.fileName.toLowerCase();
  const fileType = input.fileType.toLowerCase();
  const isTextLike =
    hasSupportedTextExtension(fileName) ||
    fileType === "text/plain" ||
    fileType === "text/markdown";
  const isHtml =
    hasSupportedHtmlExtension(fileName) ||
    fileType === "text/html" ||
    fileType === "application/xhtml+xml";
  const isPdf = hasSupportedPdfExtension(fileName) || fileType === "application/pdf";
  const isDocx =
    hasSupportedDocxExtension(fileName) ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  let rawText: string;

  if (isTextLike) {
    rawText = normalizeWhitespace(toUtf8(input.contentBytes));
  } else if (isHtml) {
    rawText = stripHtmlToText(toUtf8(input.contentBytes));
  } else if (isPdf) {
    rawText = extractPdfText(input.contentBytes);
  } else if (isDocx) {
    rawText = extractDocxText(input.contentBytes);
  } else {
    throw new UnsupportedDocumentTypeError(
      `Unsupported document type for parsing: ${input.fileName}.`,
    );
  }

  if (!rawText) {
    throw new NoExtractableTextError(
      `No extractable text found in document "${input.fileName}".`,
    );
  }

  const chunks = chunkStructuredText({
    text: rawText,
    fileName: input.fileName,
  });

  return assignChunkIndexes(chunks.length > 0 ? chunks : [{ content: rawText, sectionTitle: null }]);
}
