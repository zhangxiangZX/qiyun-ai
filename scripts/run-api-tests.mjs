import { cpSync } from "node:fs";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "apps", "api");

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && path.isAbsolute(candidate) && existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }
  throw new Error(`Unable to resolve any of the candidate paths: ${candidates.join(", ")}`);
}

const tsc = resolveExistingPath([
  path.join(apiRoot, "node_modules", "typescript", "lib", "tsc.js"),
  path.join(root, "node_modules", "typescript", "lib", "tsc.js"),
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("==> API: compile");
run(process.execPath, [tsc, "-p", "apps/api/tsconfig.json"]);

console.log("==> API: copy assets");
cpSync(path.join(apiRoot, "assets"), path.join(apiRoot, "dist", "assets"), {
  recursive: true,
});

const testFiles = [
  "dist/app.test.js",
  "dist/runtime.test.js",
  "dist/db/tenant-context.test.js",
  "dist/rag/tenant-isolation.test.js",
  "dist/auth/auth.mailer.test.js",
  "dist/auth/auth.service.change-password.test.js",
  "dist/auth/workspace-profile.service.test.js",
  "dist/http/rate-limit.test.js",
  "dist/chat/site-key.test.js",
  "dist/chat/chat.api.dashboard.test.js",
  "dist/chat/lead-intent.test.js",
  "dist/chat/intent-judge.test.js",
  "dist/llm/llm-chat.test.js",
  "dist/documents/document-storage.test.js",
  "dist/documents/document.service.test.js",
  "dist/documents/document-dead-letter-queue.test.js",
  "dist/documents/document-queue.test.js",
  "dist/documents/document-parser.test.js",
  "dist/rag/rag.providers.test.js",
  "dist/rag/rag.companion-filter.test.js",
  "dist/rag/rag.service.test.js",
  "dist/rag/vector-reconcile.test.js",
  "dist/rag/degrading-vector-store.test.js",
  "dist/rag/vector-index-log.test.js",
  "dist/health/health.service.test.js",
  "dist/integration/platform-integration.test.js",
  "dist/nest/health/health.controller.test.js",
  "dist/nest/auth/auth-context.service.test.js",
  "dist/nest/auth/auth-route.service.test.js",
  "dist/nest/auth/workspace-route.service.test.js",
  "dist/nest/documents/documents-route.service.test.js",
  "dist/nest/calendar/calendar-route.service.test.js",
  "dist/selection-pages/selection-pages.service.test.js",
  "dist/nest/public/public-route.service.test.js",
  "dist/nest/routing/nest-route.dispatcher.test.js",
  "dist/nest/http/api-prefix.middleware.test.js",
].map((file) => path.join(apiRoot, file));

console.log("==> API: node:test");
run(process.execPath, ["--test", ...testFiles], { cwd: apiRoot });

console.log("==> API tests passed");
