/**
 * Screenshot Diff：对比 reports 最新截图与 baselines
 * 使用 Playwright 内置 pixel 比对（无需额外依赖）
 *
 * 用法：node visual/compare-baselines.mjs [prefix]
 * 例：node visual/compare-baselines.mjs c02-inquiries
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASELINES = path.resolve("visual/baselines");
const REPORTS_ROOT = path.resolve("visual/reports");
const DIFF_OUT = path.resolve("visual/diffs");
const PREFIX = process.argv[2] ?? "c02-inquiries";
const NAME = `${PREFIX}-1920x1080.png`;
const THRESHOLD = Number(process.env.VISUAL_DIFF_THRESHOLD ?? "0.12");

function latestReportDir() {
  const dirs = fs
    .readdirSync(REPORTS_ROOT)
    .filter((d) => fs.statSync(path.join(REPORTS_ROOT, d)).isDirectory())
    .sort();
  return dirs.at(-1);
}

async function main() {
  const baseline = path.join(BASELINES, NAME);
  const reportDir = latestReportDir();
  if (!reportDir) throw new Error("no reports dir");
  const actual = path.join(REPORTS_ROOT, reportDir, NAME);
  if (!fs.existsSync(baseline)) throw new Error(`missing baseline: ${baseline}`);
  if (!fs.existsSync(actual)) throw new Error(`missing actual: ${actual}`);

  fs.mkdirSync(DIFF_OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Playwright 没有直接暴露 PNG compare API 给脚本，用 canvas ImageData 简易比对
  const result = await page.evaluate(
    async ({ baselineB64, actualB64, threshold }) => {
      function load(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      }
      const a = await load(`data:image/png;base64,${baselineB64}`);
      const b = await load(`data:image/png;base64,${actualB64}`);
      const w = Math.min(a.width, b.width);
      const h = Math.min(a.height, b.height);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(a, 0, 0);
      const base = ctx.getImageData(0, 0, w, h).data;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(b, 0, 0);
      const act = ctx.getImageData(0, 0, w, h).data;
      let diffPixels = 0;
      const total = w * h;
      for (let i = 0; i < base.length; i += 4) {
        const dr = Math.abs(base[i] - act[i]);
        const dg = Math.abs(base[i + 1] - act[i + 1]);
        const db = Math.abs(base[i + 2] - act[i + 2]);
        if (dr + dg + db > 30) diffPixels += 1;
      }
      const ratio = diffPixels / total;
      return { w, h, diffPixels, ratio, pass: ratio <= threshold };
    },
    {
      baselineB64: fs.readFileSync(baseline).toString("base64"),
      actualB64: fs.readFileSync(actual).toString("base64"),
      threshold: THRESHOLD,
    },
  );

  await browser.close();
  const summary = {
    name: NAME,
    reportDir,
    threshold: THRESHOLD,
    ...result,
  };
  fs.writeFileSync(path.join(DIFF_OUT, `${PREFIX}-diff.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!result.pass) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
