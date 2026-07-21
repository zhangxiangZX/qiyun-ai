import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const widgetRoot = path.resolve(e2eDir, "..");
const consoleE2eRoot = path.resolve(widgetRoot, "..", "console", "e2e");
const port = Number(process.env.WIDGET_E2E_PORT ?? "4173");
const baseURL = `http://127.0.0.1:${port}`;

const leadCaptureSse = [
  "event: meta",
  'data: {"conversationId":"conv_e2e"}',
  "",
  "event: done",
  'data: {"needsLeadCapture":true,"leadFields":["name","phone","company","requirement"],"messageId":"msg_e2e","content":"请补充联系方式以便工程师跟进。","suggestedQuestions":["这次预计采购多少台？","方便提供外形尺寸或图纸吗？","项目希望多久内交付？"]}',
  "",
].join("\n");

const chatDoneSse = [
  "event: meta",
  'data: {"conversationId":"conv_e2e_q","welcomeMessage":"来自 API 的欢迎语","recommendedQuestions":["报价怎么估？","支持图纸定制吗？"]}',
  "",
  "event: token",
  'data: {"text":"好的，我先帮您梳理关键参数。"}',
  "",
  "event: citations",
  'data: {"items":[{"documentTitle":"冷水机选型手册","snippet":"标准冷水机适用于连续工业冷却工况。"}]}',
  "",
  "event: done",
  'data: {"needsLeadCapture":false,"messageId":"msg_e2e_q","content":"好的，我先帮您梳理关键参数。","suggestedQuestions":["这次预计采购多少台？","方便先提供尺寸或安装环境吗？","要不要我继续帮你判断报价所缺参数？"]}',
  "",
].join("\n");

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

function startStaticServer() {
  const widgetJs = path.join(widgetRoot, "dist", "widget.js");
  if (!existsSync(widgetJs)) {
    throw new Error("Missing dist/widget.js. Run: pnpm --filter qiyun-widget build");
  }

  const fixtureHtml = readFileSync(path.join(e2eDir, "fixture.html"), "utf8").replace(
    "__PORT__",
    String(port),
  );

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", baseURL);

    if (url.pathname === "/public/widget/config") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          botId: "bot_e2e",
          botName: "E2E 演示机器人",
          welcomeMessage: "来自 API 的欢迎语，请问需要什么帮助？",
          recommendedQuestions: ["报价怎么估？", "支持图纸定制吗？"],
        }),
      );
      return;
    }

    if (url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(fixtureHtml);
      return;
    }

    if (url.pathname === "/widget.js") {
      response.writeHead(200, { "content-type": contentType(url.pathname) });
      createReadStream(widgetJs).pipe(response);
      return;
    }

    response.writeHead(404);
    response.end("Not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function resolvePlaywright() {
  const playwrightPath = path.join(consoleE2eRoot, "node_modules", "playwright", "index.mjs");
  if (!existsSync(playwrightPath)) {
    throw new Error(
      "Missing playwright in apps/console/e2e/node_modules. Run: cd apps/console/e2e && npm install",
    );
  }
  return import(pathToFileURL(playwrightPath).href);
}

async function openWidget(page) {
  await page.goto(`${baseURL}/`);
  await page.getByRole("button", { name: "打开客服窗口" }).click();
  await page.getByRole("dialog", { name: "企云 AI 客服" }).waitFor();
}

async function runWidgetRecommendedQuestionsTest(page) {
  let askedQuestion = "";

  await page.route("**/public/chat/stream", async (route) => {
    const body = route.request().postDataJSON();
    askedQuestion = body?.message ?? "";
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body: chatDoneSse,
    });
  });

  await openWidget(page);
  await page.getByText("来自 API 的欢迎语，请问需要什么帮助？").waitFor();
  await page.getByText("首次咨询可以先这样问：").waitFor();
  await page.getByRole("button", { name: "报价怎么估？" }).click();

  await page.getByText("报价怎么估？").waitFor();
  await page.getByText("好的，我先帮您梳理关键参数。").waitFor();
  await page.getByText("资料来源（1）").waitFor();
  await page.getByText("冷水机选型手册").waitFor();
  await page.getByText("继续把需求推进下去，可以这样问：").waitFor();
  await page.getByRole("button", { name: "这次预计采购多少台？" }).waitFor();

  if (askedQuestion !== "报价怎么估？") {
    throw new Error(`Expected recommended question to be sent, got: ${askedQuestion}`);
  }
}

async function runWidgetLeadCaptureTest(page) {
  let leadSubmitted = false;

  await page.route("**/public/chat/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body: leadCaptureSse,
    });
  });

  await page.route("**/public/leads", async (route) => {
    const body = route.request().postDataJSON();
    if (
      body?.conversationId !== "conv_e2e" ||
      body?.fields?.name !== "张工" ||
      body?.fields?.requirement !== "需要工业冷水机报价"
    ) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid lead payload." }),
      });
      return;
    }

    leadSubmitted = true;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "lead_e2e" }),
    });
  });

  await openWidget(page);
  await page.getByRole("textbox", { name: "消息输入" }).fill("这套设备报价是多少？");
  await page.getByRole("button", { name: "发送" }).click();

  await page.getByRole("region", { name: "留资表单" }).waitFor();
  await page.getByText("请补充联系方式，便于工程师确认报价与图纸需求。").waitFor();
  await page.getByText("为了更快推进报价或交期，建议继续确认：").waitFor();
  await page.getByRole("button", { name: "这次预计采购多少台？" }).waitFor();

  const form = page.getByRole("region", { name: "留资表单" });
  await form.getByPlaceholder("请输入您的姓名").fill("张工");
  await form.getByPlaceholder("请输入联系电话").fill("13800138000");
  await form.getByPlaceholder("请输入公司名称").fill("华东制造");
  await form.getByPlaceholder("请描述报价/选型/图纸等需求").fill("需要工业冷水机报价");
  await form.locator('input[type="checkbox"]').check();
  await form.getByRole("button", { name: "提交留资" }).click();

  await page.getByText("已收到您的留资信息，工程师会尽快联系您。").waitFor();

  if (!leadSubmitted) {
    throw new Error("Lead submit API was not called.");
  }
}

async function main() {
  const server = await startStaticServer();
  const { chromium } = await resolvePlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    process.stdout.write("  - Widget 首屏推荐与二次追问... ");
    await runWidgetRecommendedQuestionsTest(page);
    console.log("ok");

    process.stdout.write("  - Widget 高意向留资推进链路... ");
    await runWidgetLeadCaptureTest(page);
    console.log("ok");
  } catch (error) {
    console.log("FAIL");
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve(undefined)));
    });
  }

  if (!process.exitCode) {
    console.log("==> Widget browser E2E passed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
