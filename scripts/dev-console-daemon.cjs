// 零依赖 dev server 守护进程
// 作用：自动拉起 `next dev`，进程崩溃/退出即自动重启，避免"后台 dev 崩了 → 全站 500"
// 用法（在 E:/qiyun-ai 下）：
//   node scripts/dev-console-daemon.cjs              # 默认 3000
//   PORT=3100 node scripts/dev-console-daemon.cjs    # 自定义端口
// 停止：Ctrl+C（会先杀掉子进程再退出）
const { spawn } = require("child_process");
const path = require("path");

const PORT = process.env.PORT || 3000;
const APP_DIR = path.resolve(__dirname, "..", "apps", "console");
const MAX_RESTARTS = 20;
const RESTART_DELAY = 2000;

let restarts = 0;
let child = null;
let stopping = false;

function start() {
  if (stopping) return;
  console.log(`[daemon] starting next dev on port ${PORT} (attempt ${restarts + 1})`);
  child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: APP_DIR,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    console.error(`[daemon] next dev exited (code=${code} signal=${signal})`);
    child = null;
    if (stopping) return;
    if (restarts >= MAX_RESTARTS) {
      console.error(`[daemon] reached max restarts (${MAX_RESTARTS}); giving up to avoid crash loop.`);
      process.exit(1);
      return;
    }
    restarts += 1;
    console.log(`[daemon] restarting in ${RESTART_DELAY}ms...`);
    setTimeout(start, RESTART_DELAY);
  });

  child.on("error", (err) => {
    console.error("[daemon] failed to spawn next dev:", err.message);
  });
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log("[daemon] shutting down, killing dev server...");
  if (child) child.kill("SIGTERM");
  // 给子进程一点时间优雅退出
  setTimeout(() => process.exit(0), 800);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
