import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const shots = [
  { w: 390, h: 844, name: "mobile-390" },
  { w: 820, h: 1180, name: "pad-820" },
  { w: 1440, h: 900, name: "pc-1440" },
  { w: 2560, h: 1440, name: "large-2560" },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  await page.goto(`${BASE}/dashboard/leads`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `e2e/shots/${s.name}.png` });
  console.log("shot", s.name);
  await page.close();
}
await browser.close();
console.log("DONE");
