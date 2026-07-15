import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const consoleRoot = path.join(root, "apps", "console");

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && path.isAbsolute(candidate) && existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }
  throw new Error(`Unable to resolve any of the candidate paths: ${candidates.join(", ")}`);
}

function resolveTsxRunner() {
  const binaryCandidates = [
    process.platform === "win32"
      ? path.join(consoleRoot, "node_modules", ".bin", "tsx.CMD")
      : path.join(consoleRoot, "node_modules", ".bin", "tsx"),
    process.platform === "win32"
      ? path.join(root, "node_modules", ".bin", "tsx.CMD")
      : path.join(root, "node_modules", ".bin", "tsx"),
  ];

  for (const candidate of binaryCandidates) {
    if (candidate && existsSync(candidate)) {
      return {
        command: candidate,
        argsPrefix: [],
      };
    }
  }

  const cliCandidates = [
    path.join(root, "node_modules", ".pnpm", "tsx@4.22.4", "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(root, "node_modules", ".pnpm", "tsx@4.22.4", "node_modules", "tsx", "dist", "cli.cjs"),
  ];

  for (const candidate of cliCandidates) {
    if (candidate && existsSync(candidate)) {
      return {
        command: process.execPath,
        argsPrefix: [candidate],
      };
    }
  }

  throw new Error(`Unable to resolve a tsx runner from: ${[...binaryCandidates, ...cliCandidates].join(", ")}`);
}

function collectTestFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

const tsxRunner = resolveTsxRunner();

const testFiles = collectTestFiles(path.join(consoleRoot, "src")).sort();

function run(command, args, cwd) {
  const isWindowsCmd = process.platform === "win32" && /\.cmd$/i.test(command);
  const result = isWindowsCmd
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", command, ...args], {
        stdio: "inherit",
        cwd,
      })
    : spawnSync(command, args, { stdio: "inherit", cwd });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`==> Console: tsx node:test (${testFiles.length} files)`);
run(tsxRunner.command, [...tsxRunner.argsPrefix, "--test", ...testFiles], consoleRoot);
console.log("==> Console tests passed");
