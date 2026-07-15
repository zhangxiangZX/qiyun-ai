import { chromium } from "playwright";

const url = new URL("./verify-layout.html", import.meta.url).href;
const browser = await chromium.launch();

const cases = [
  { w: 2560, h: 1440, label: "large-2560" },
  { w: 1920, h: 1080, label: "desktop-1920" },
  { w: 1440, h: 900, label: "pc-1440" },
];

const page = await browser.newPage();
let allPass = true;

for (const c of cases) {
  await page.setViewportSize({ width: c.w, height: c.h });
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  const m = await page.evaluate(() => {
    const content = document.querySelector(".content");
    const canvas = document.querySelector(".console-main-canvas");
    const r = content.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const cs = getComputedStyle(content);
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const maxW = cs.maxWidth;
    const marginInline = cs.marginLeft + "/" + cs.marginRight;
    return {
      viewportW: window.innerWidth,
      canvasW: Math.round(cr.width),
      contentW: Math.round(r.width),
      leftGap: Math.round(r.left - cr.left),
      rightGap: Math.round(cr.right - r.right),
      maxW,
      marginInline,
      primary,
    };
  });
  const centered =
    Math.abs(m.leftGap - m.rightGap) <= 2 ? "CENTERED" : `OFF(${m.leftGap}/${m.rightGap})`;
  const expectContent = c.w >= 1920 + 240 ? 1920 : c.w - 240; // capped at 1920 when canvas>1920
  const widthOk = Math.abs(m.contentW - expectContent) <= 2;
  const pass = widthOk && m.leftGap === m.rightGap;
  allPass = allPass && pass;
  console.log(
    `[${c.label}] vp=${m.viewportW} canvas=${m.canvasW} content=${m.contentW} ` +
      `gap(L/R)=${m.leftGap}/${m.rightGap} ${centered} maxW=${m.maxW} ` +
      `margin=${m.marginInline} --primary="${m.primary}" => ${pass ? "PASS" : "FAIL"}`
  );
}

await page.close();
await browser.close();
console.log(allPass ? "ALL_PASS" : "SOME_FAIL");
