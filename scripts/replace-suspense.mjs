import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const root = "E:/qiyun-ai";
const dashboardDir = join(root, "apps/console/src/app/dashboard");

// Recursively find all page.tsx files
function findPageFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPageFiles(fullPath));
    } else if (entry.name === "page.tsx") {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findPageFiles(dashboardDir);
const importLine = `import { PageSkeleton } from "@/components/layout/page-skeleton";`;
let changed = 0;
let skipped = 0;

for (const fullPath of files) {
  const content = readFileSync(fullPath, "utf-8");

  if (!content.includes("Suspense fallback={null}")) {
    skipped++;
    continue;
  }

  let newContent = content.replace(/Suspense fallback=\{null\}/g, "Suspense fallback={<PageSkeleton />}");

  // Add import after the last import line
  if (!newContent.includes(importLine)) {
    const importRegex = /^import .+;$/gm;
    let lastImportEnd = 0;
    let match;
    while ((match = importRegex.exec(newContent)) !== null) {
      lastImportEnd = match.index + match[0].length;
    }

    if (lastImportEnd > 0) {
      newContent = newContent.slice(0, lastImportEnd) + "\n" + importLine + newContent.slice(lastImportEnd);
    } else {
      newContent = importLine + "\n" + newContent;
    }
  }

  writeFileSync(fullPath, newContent, "utf-8");
  changed++;
}

console.log(`Done: ${changed} files modified, ${skipped} skipped`);
