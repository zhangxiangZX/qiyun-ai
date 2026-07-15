export const mockAuthSession = {
  authenticated: true,
  user: {
    id: "user_e2e_auth",
    email: "auth-e2e@example.com",
    name: "Auth E2E",
    activeWorkspaceId: "ws_e2e",
  },
  workspaces: [
    {
      id: "ws_e2e",
      name: "E2E Workspace",
      slug: "e2e",
      role: "owner",
      isActive: true,
    },
  ],
};

export async function mockAuthLoginSuccess(page, session = mockAuthSession) {
  await page.route("**/api/auth/login*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "set-cookie": `qiyun_auth_user=${encodeURIComponent(JSON.stringify(session.user))}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify(session),
    });
  });
  await page.route("**/api/auth/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
}

export function mockAuthLoginFailure(page, message = "Invalid email or password.", status = 401) {
  return page.route("**/api/auth/login*", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ message }),
    });
  });
}

export function mockAuthRegisterSuccess(page, session = mockAuthSession) {
  return page.route("**/api/auth/register", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
}

export function mockPasswordResetRequest(page, debugCode = "123456") {
  return page.route("**/api/auth/password-reset/request*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sent: true,
        expiresAt: "2026-07-03T12:00:00.000Z",
        deliveryMode: "simulated",
        debugCode,
      }),
    });
  });
}

export function mockPasswordResetConfirm(page) {
  return page.route("**/api/auth/password-reset/confirm*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reset: true }),
    });
  });
}

export function mockTrialRequestSuccess(page) {
  return page.route("**/api/trial-requests*", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "trial_e2e", status: "pending" }),
    });
  });
}

export async function assertAgreementBeforeSubmit(page, formSelector = "#loginForm") {
  const ok = await page.locator(formSelector).evaluate((form) => {
    const submit = form.querySelector('button[type="submit"]');
    const agreement = Array.from(form.querySelectorAll("label")).find(
      (label) =>
        label.querySelector('input[type="checkbox"]') &&
        label.textContent?.includes("用户协议"),
    );
    if (!submit || !agreement) return false;
    return Boolean(agreement.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING);
  });

  if (!ok) {
    throw new Error("Agreement checkbox must appear before submit button");
  }
}
