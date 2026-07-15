/**
 * V1-ACC-01 lightweight checklist: API login + page HTTP smoke + key APIs.
 * Does not replace full Playwright UI E2E when browsers are unavailable.
 */
const consoleBase = process.env.CONSOLE_BASE_URL ?? "http://localhost:3000";
const apiBase = process.env.API_BASE_URL ?? "http://localhost:3001";
const email = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD ?? "Qiyun@2026";

const PAGES = [
  ["公共", "/"],
  ["公共", "/trial"],
  ["公共", "/login"],
  ["公共", "/register"],
  ["公共", "/forgot-password"],
  ["工作台", "/dashboard/boss"],
  ["工作台", "/dashboard/admin"],
  ["工作台", "/dashboard/sales-rep"],
  ["获客", "/dashboard/bots/landing"],
  ["获客", "/dashboard/bots/landing/edit?page=new&section=basic"],
  ["获客", "/dashboard/bots/landing/mobile"],
  ["获客", "/dashboard/sites"],
  ["获客", "/dashboard/channels/links"],
  ["获客", "/dashboard/channels/qrcodes"],
  ["AI", "/dashboard/bots"],
  ["AI", "/dashboard/knowledge-bases"],
  ["AI", "/dashboard/conversations/test"],
  ["客户机会", "/dashboard/quick-entry"],
  ["客户机会", "/dashboard/inquiries"],
  ["客户机会", "/dashboard/tasks"],
  ["报价", "/dashboard/quotes"],
  ["报价", "/dashboard/quotes/templates"],
  ["报价", "/dashboard/quotes/new"],
  ["数据", "/dashboard/sales"],
  ["数据", "/dashboard/reports/channel"],
  ["数据", "/dashboard/reports/follow-up"],
  ["数据", "/dashboard/reports/export"],
  ["设置", "/dashboard/team/profile"],
  ["设置", "/dashboard/team"],
  ["设置", "/dashboard/team/roles"],
  ["设置", "/dashboard/logs"],
  ["设置", "/dashboard/settings/account"],
  ["设置", "/dashboard/system-status"],
];

const APIS = [
  "/health",
  "/bots",
  "/inquiries",
  "/quote-opportunities",
  "/quote-templates",
  "/selection-pages",
  "/sales-links",
  "/sites",
  "/knowledge-bases",
  "/audit-logs",
  "/follow-tasks",
  "/reports",
];

function unwrap(payload) {
  return payload?.data ?? payload;
}

async function login() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  const data = unwrap(body);
  const accessToken = data?.tokens?.accessToken ?? data?.accessToken;
  const refreshToken = data?.tokens?.refreshToken ?? data?.refreshToken;
  const user = data?.user;
  if (!res.ok || !accessToken || !user) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }

  const cookie = [
    `qiyun_access_token=${accessToken}`,
    refreshToken ? `qiyun_refresh_token=${refreshToken}` : null,
    `qiyun_auth_user=${encodeURIComponent(JSON.stringify(user))}`,
  ]
    .filter(Boolean)
    .join("; ");

  return { token: accessToken, cookie, workspaceId: user.activeWorkspaceId ?? null };
}

async function checkPages(cookie) {
  const results = [];
  for (const [module, path] of PAGES) {
    try {
      const res = await fetch(`${consoleBase}${path}`, {
        headers: cookie ? { cookie } : undefined,
        redirect: "follow",
      });
      const text = await res.text();
      const crashed = /Application error|Internal Server Error|__next_error__/i.test(text);
      const redirectedToLogin = /\/login/i.test(res.url) && path.startsWith("/dashboard");
      results.push({
        module,
        path,
        status: res.status,
        ok: res.ok && !crashed && !redirectedToLogin,
        crashed,
        redirectedToLogin,
      });
    } catch (error) {
      results.push({ module, path, ok: false, error: String(error) });
    }
  }
  return results;
}

async function checkApis(token) {
  const results = [];
  for (const path of APIS) {
    const res = await fetch(`${apiBase}${path}`, {
      headers: path === "/health" ? undefined : { authorization: `Bearer ${token}` },
    });
    results.push({ path, status: res.status, ok: res.status >= 200 && res.status < 300 });
  }
  return results;
}

async function main() {
  console.log("==> V1-ACC-01 checklist");
  console.log(`    Console: ${consoleBase}`);
  console.log(`    API:     ${apiBase}`);
  console.log(`    Account: ${email}`);

  const { token, cookie, workspaceId } = await login();
  console.log(`    Login OK (workspace: ${workspaceId})`);

  const pages = await checkPages(cookie);
  const apis = await checkApis(token);
  const pageFail = pages.filter((p) => !p.ok);
  const apiFail = apis.filter((a) => !a.ok);

  const report = {
    generatedAt: new Date().toISOString(),
    environment: { consoleBase, apiBase, email, workspaceId },
    summary: {
      pagesPass: pages.filter((p) => p.ok).length,
      pagesTotal: pages.length,
      apisPass: apis.filter((a) => a.ok).length,
      apisTotal: apis.length,
    },
    pageFail,
    apiFail,
    pages,
    apis,
  };

  const fs = await import("node:fs/promises");
  const out = new URL("../ACC01-CHECKLIST-REPORT.json", import.meta.url);
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");

  console.log(`\n==> Pages ${report.summary.pagesPass}/${report.summary.pagesTotal}`);
  for (const row of pageFail) {
    console.log(`  FAIL ${row.path} status=${row.status ?? "-"} redirected=${Boolean(row.redirectedToLogin)}`);
  }
  console.log(`==> APIs ${report.summary.apisPass}/${report.summary.apisTotal}`);
  for (const row of apiFail) {
    console.log(`  FAIL ${row.path} status=${row.status}`);
  }
  console.log(`==> Report: ${out.pathname}`);

  if (pageFail.length || apiFail.length) process.exitCode = 1;
  else console.log("==> ALL PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
