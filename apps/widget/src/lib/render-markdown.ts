function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line);
}

function isOrderedLine(line: string): boolean {
  return /^\d+[.)]\s+/.test(line);
}

function renderListLines(lines: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const items = lines
    .map((line) => {
      const content = ordered
        ? line.replace(/^\d+[.)]\s+/, "")
        : line.replace(/^[-*•]\s+/, "");
      return `<li>${renderInlineMarkdown(escapeHtml(content))}</li>`;
    })
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

function renderParagraphLines(lines: string[]): string {
  return `<p>${lines
    .map((line) => renderInlineMarkdown(escapeHtml(line)))
    .join("<br />")}</p>`;
}

export function renderMarkdownToHtml(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n([-*•]\s)/g, "$1\n\n$2")
    .replace(/([^\n])\n(\d+[.)]\s)/g, "$1\n\n$2")
    .trim();

  if (!normalized) {
    return "";
  }

  const blocks = normalized.split(/\n{2,}/);
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) {
      continue;
    }

    if (lines.every(isBulletLine)) {
      htmlParts.push(renderListLines(lines, false));
      continue;
    }

    if (lines.every(isOrderedLine)) {
      htmlParts.push(renderListLines(lines, true));
      continue;
    }

    let index = 0;
    while (index < lines.length) {
      const line = lines[index] ?? "";
      if (isBulletLine(line)) {
        const listLines: string[] = [];
        while (index < lines.length && isBulletLine(lines[index] ?? "")) {
          listLines.push(lines[index] ?? "");
          index += 1;
        }
        htmlParts.push(renderListLines(listLines, false));
        continue;
      }

      if (isOrderedLine(line)) {
        const listLines: string[] = [];
        while (index < lines.length && isOrderedLine(lines[index] ?? "")) {
          listLines.push(lines[index] ?? "");
          index += 1;
        }
        htmlParts.push(renderListLines(listLines, true));
        continue;
      }

      const paragraphLines: string[] = [];
      while (
        index < lines.length &&
        !isBulletLine(lines[index] ?? "") &&
        !isOrderedLine(lines[index] ?? "")
      ) {
        paragraphLines.push(lines[index] ?? "");
        index += 1;
      }
      htmlParts.push(renderParagraphLines(paragraphLines));
    }
  }

  return htmlParts.join("");
}
