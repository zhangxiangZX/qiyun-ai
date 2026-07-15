import type { ParsedDocumentChunk } from "./document.types";

export const DEFAULT_MAX_CHUNK_CHARS = 900;
export const DEFAULT_CHUNK_OVERLAP_CHARS = 100;

export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .split("\0")
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokenCount(text: string): number {
  const compact = text.replace(/\s+/g, "");
  if (!compact) {
    return 0;
  }

  let cjk = 0;
  for (const character of compact) {
    if (/[\u3400-\u9fff]/u.test(character)) {
      cjk += 1;
    }
  }

  const latin = compact.length - cjk;
  return Math.max(1, Math.ceil(cjk / 1.5 + latin / 4));
}

export function removeRepeatedNoiseLines(text: string): string {
  const lines = text.split("\n");
  const counts = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 4 || trimmed.length > 80) {
      continue;
    }
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  const noisy = new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= 4)
      .map(([line]) => line),
  );

  if (noisy.size === 0) {
    return text;
  }

  return lines
    .filter((line) => !noisy.has(line.trim()))
    .join("\n");
}

export function stripHtmlToText(html: string): string {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">"),
  );
}

interface StructuredSection {
  title: string | null;
  body: string;
}

function splitMarkdownSections(text: string): StructuredSection[] {
  const lines = text.split("\n");
  const sections: StructuredSection[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    const body = normalizeWhitespace(currentLines.join("\n"));
    if (body || currentTitle) {
      sections.push({ title: currentTitle, body });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flush();
      currentTitle = heading[2]?.trim() ?? null;
      continue;
    }
    currentLines.push(line);
  }

  flush();
  return sections.filter((section) => section.body || section.title);
}

function splitParagraphBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeBlocksWithOverlap(
  blocks: string[],
  maxChars: number,
  overlapChars: number,
): string[] {
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (!current.trim()) {
      return;
    }
    chunks.push(current.trim());
    if (overlapChars > 0 && current.length > overlapChars) {
      current = current.slice(-overlapChars).trimStart();
    } else {
      current = "";
    }
  };

  for (const block of blocks) {
    if (!current) {
      current = block;
      if (current.length >= maxChars) {
        pushCurrent();
      }
      continue;
    }

    const candidate = `${current}\n\n${block}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    pushCurrent();
    current = block;
    if (current.length >= maxChars) {
      pushCurrent();
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

export function chunkStructuredText(input: {
  text: string;
  fileName: string;
  maxChars?: number;
  overlapChars?: number;
  preferMarkdownHeadings?: boolean;
}): ParsedDocumentChunk[] {
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHUNK_CHARS;
  const overlapChars = input.overlapChars ?? DEFAULT_CHUNK_OVERLAP_CHARS;
  const cleaned = removeRepeatedNoiseLines(normalizeWhitespace(input.text));
  if (!cleaned) {
    return [];
  }

  const lowerName = input.fileName.toLowerCase();
  const preferMarkdown =
    input.preferMarkdownHeadings ??
    (lowerName.endsWith(".md") || lowerName.endsWith(".markdown"));

  const sectionSources: StructuredSection[] = preferMarkdown
    ? splitMarkdownSections(cleaned)
    : [{ title: null, body: cleaned }];

  const parsed: ParsedDocumentChunk[] = [];

  for (const section of sectionSources) {
    const blocks = splitParagraphBlocks(section.body);
    const merged =
      blocks.length > 0 ? mergeBlocksWithOverlap(blocks, maxChars, overlapChars) : [section.body];

    for (const content of merged.filter(Boolean)) {
      parsed.push({
        content,
        sectionTitle: section.title,
      });
    }
  }

  return parsed.length > 0 ? parsed : [{ content: cleaned, sectionTitle: null }];
}
