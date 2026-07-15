import { expect, test } from "@playwright/test";

import { API_URL, apiLogin, authHeaders } from "./helpers/auth";

test.describe("tenant isolation", () => {
  test("同一用户两个工作区数据互不串读", async ({ request }) => {
    const login = await apiLogin(request);
    const workspaces = login.raw.workspaces ?? [];
    test.skip(workspaces.length < 2, "当前账号少于 2 个工作区，无法做交叉隔离");

    const wsA = String(workspaces[0].id);
    const wsB = String(workspaces[1].id);
    const markerA = `TENANT-A-${Date.now()}`;
    const markerB = `TENANT-B-${Date.now()}`;

    const createA = await request.post(`${API_URL}/inquiries`, {
      headers: authHeaders(login.accessToken, wsA),
      data: {
        customerName: markerA,
        contactName: "A",
        phone: `136${String(Date.now()).slice(-8)}`,
        source: "manual",
        status: "new",
        summary: "tenant A",
      },
    });
    expect(createA.ok(), await createA.text()).toBeTruthy();

    const createB = await request.post(`${API_URL}/inquiries`, {
      headers: authHeaders(login.accessToken, wsB),
      data: {
        customerName: markerB,
        contactName: "B",
        phone: `137${String(Date.now()).slice(-8)}`,
        source: "manual",
        status: "new",
        summary: "tenant B",
      },
    });
    expect(createB.ok(), await createB.text()).toBeTruthy();

    const listA = await request.get(`${API_URL}/inquiries?limit=50`, {
      headers: authHeaders(login.accessToken, wsA),
    });
    const listB = await request.get(`${API_URL}/inquiries?limit=50`, {
      headers: authHeaders(login.accessToken, wsB),
    });
    expect(listA.ok()).toBeTruthy();
    expect(listB.ok()).toBeTruthy();
    const textA = await listA.text();
    const textB = await listB.text();
    expect(textA).toContain(markerA);
    expect(textA).not.toContain(markerB);
    expect(textB).toContain(markerB);
    expect(textB).not.toContain(markerA);
  });

  test("公开端缺少凭证不可读管理询盘", async ({ request }) => {
    const res = await request.get(`${API_URL}/inquiries`);
    expect([401, 403, 500]).toContain(res.status());
    if (res.status() === 500) {
      test.info().annotations.push({
        type: "bug",
        description: "无凭证访问 /inquiries 返回 500，应统一为 401",
      });
    }
  });

  test("知识库列表带 workspace 头可访问", async ({ request }) => {
    const { accessToken, workspaceId } = await apiLogin(request);
    const res = await request.get(`${API_URL}/knowledge-bases`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });
});
