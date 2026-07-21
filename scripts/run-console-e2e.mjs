import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const consoleRoot = path.join(root, "apps", "console");
const e2eRoot = path.join(consoleRoot, "e2e");
const playwrightCli = path.join(e2eRoot, "node_modules", "playwright", "cli.js");

function run(command, args, cwd) {
  const isWindowsCmd = process.platform === "win32" && /\.cmd$/i.test(command);
  const result = isWindowsCmd
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", command, ...args], {
        stdio: "inherit",
        cwd,
        env: process.env,
      })
    : spawnSync(command, args, { stdio: "inherit", cwd, env: process.env });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNode(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    cwd: consoleRoot,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureE2eDeps() {
  if (!existsSync(path.join(e2eRoot, "node_modules", "playwright"))) {
    console.log("==> Console E2E: npm install in apps/console/e2e");
    run("npm", ["install", "--no-package-lock", "--no-fund", "--no-audit"], e2eRoot);
  }
}

function ensureChromium() {
  if (!existsSync(playwrightCli)) {
    console.error("Missing Playwright CLI. Run: cd apps/console/e2e && npm install");
    process.exit(1);
  }

  console.log("==> Console E2E: ensure Chromium browser is installed");
  run(process.execPath, [playwrightCli, "install", "chromium"], e2eRoot);
}

ensureE2eDeps();
ensureChromium();

const failures = [];

console.log("==> Console Playwright: C-P0-07 v1 delivery critical journeys");
{
  const result = spawnSync(
    process.execPath,
    [
      playwrightCli,
      "test",
      "--config",
      path.join(e2eRoot, "playwright.config.mjs"),
      path.join(e2eRoot, "v1-delivery-critical.spec.ts"),
    ],
    { stdio: "inherit", cwd: consoleRoot, env: process.env },
  );
  if ((result.status ?? 1) !== 0) failures.push("v1-delivery-critical");
}

console.log("==> Console browser E2E (legacy runner)");
{
  const result = spawnSync(process.execPath, [path.join(e2eRoot, "run-browser-tests.mjs")], {
    stdio: "inherit",
    cwd: consoleRoot,
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) failures.push("browser-tests");
}

if (failures.length) {
  console.error(`==> Console E2E failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("==> Console E2E passed");
