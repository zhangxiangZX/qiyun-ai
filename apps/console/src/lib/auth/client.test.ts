import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmPasswordResetWithConsole,
  fetchAuthSession,
  loginWithConsole,
  logoutWithConsole,
  registerWithConsole,
  requestLoginCodeWithConsole,
  requestPasswordResetWithConsole,
  verifyLoginCodeWithConsole,
} from "@/lib/auth/client";
import { jsonResponse, withFetchMock } from "@/lib/test/console-fetch-mock";

const mockSession = {
  authenticated: true,
  user: {
    id: "user_1",
    email: "demo@example.com",
    name: "Demo User",
    activeWorkspaceId: "ws_1",
  },
  workspaces: [
    {
      id: "ws_1",
      name: "Demo Workspace",
      slug: "demo",
      role: "owner" as const,
      isActive: true,
    },
  ],
};

test("loginWithConsole returns session on success", async () => {
  await withFetchMock(
    (url, init) => {
      assert.match(url, /\/api\/auth\/login$/);
      assert.equal(init?.method, "POST");
      return jsonResponse(mockSession);
    },
    async () => {
      const session = await loginWithConsole({
        email: "demo@example.com",
        password: "secret123",
      });
      assert.deepEqual(session, mockSession);
    },
  );
});

test("loginWithConsole throws upstream message on failure", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/login$/);
      return jsonResponse({ message: "Invalid email or password." }, 401);
    },
    async () => {
      await assert.rejects(
        () =>
          loginWithConsole({
            email: "demo@example.com",
            password: "wrong",
          }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "Invalid email or password.");
          return true;
        },
      );
    },
  );
});

test("registerWithConsole returns session on success", async () => {
  await withFetchMock(
    (url, init) => {
      assert.match(url, /\/api\/auth\/register$/);
      assert.equal(init?.method, "POST");
      return jsonResponse(mockSession);
    },
    async () => {
      const session = await registerWithConsole({
        name: "Demo User",
        email: "demo@example.com",
        password: "secret123",
        workspaceName: "Demo Workspace",
      });
      assert.deepEqual(session, mockSession);
    },
  );
});

test("registerWithConsole throws upstream message on failure", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/register$/);
      return jsonResponse({ message: "Email already registered." }, 409);
    },
    async () => {
      await assert.rejects(
        () =>
          registerWithConsole({
            name: "Demo User",
            email: "demo@example.com",
            password: "secret123",
          }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "Email already registered.");
          return true;
        },
      );
    },
  );
});

test("requestLoginCodeWithConsole returns sent payload on success", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/code\/request$/);
      return jsonResponse({
        sent: true,
        expiresAt: "2026-07-03T12:00:00.000Z",
        debugCode: "123456",
      });
    },
    async () => {
      const result = await requestLoginCodeWithConsole({ email: "demo@example.com" });
      assert.equal(result.sent, true);
      assert.equal(result.debugCode, "123456");
    },
  );
});

test("verifyLoginCodeWithConsole returns session on success", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/code\/verify$/);
      return jsonResponse(mockSession);
    },
    async () => {
      const session = await verifyLoginCodeWithConsole({
        email: "demo@example.com",
        code: "123456",
      });
      assert.deepEqual(session, mockSession);
    },
  );
});

test("requestPasswordResetWithConsole returns sent payload on success", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/password-reset\/request$/);
      return jsonResponse({
        sent: true,
        expiresAt: "2026-07-03T12:00:00.000Z",
        debugCode: "654321",
      });
    },
    async () => {
      const result = await requestPasswordResetWithConsole({ email: "demo@example.com" });
      assert.equal(result.sent, true);
      assert.equal(result.debugCode, "654321");
    },
  );
});

test("confirmPasswordResetWithConsole returns reset result on success", async () => {
  await withFetchMock(
    (url, init) => {
      assert.match(url, /\/api\/auth\/password-reset\/confirm$/);
      assert.equal(init?.method, "POST");
      return jsonResponse({ reset: true });
    },
    async () => {
      const result = await confirmPasswordResetWithConsole({
        email: "demo@example.com",
        code: "654321",
        newPassword: "newsecret123",
      });
      assert.deepEqual(result, { reset: true });
    },
  );
});

test("confirmPasswordResetWithConsole throws upstream message on failure", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/password-reset\/confirm$/);
      return jsonResponse({ message: "Verification code expired." }, 400);
    },
    async () => {
      await assert.rejects(
        () =>
          confirmPasswordResetWithConsole({
            email: "demo@example.com",
            code: "000000",
            newPassword: "newsecret123",
          }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "Verification code expired.");
          return true;
        },
      );
    },
  );
});

test("fetchAuthSession returns null on 401", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/session$/);
      return jsonResponse({ message: "No active session." }, 401);
    },
    async () => {
      const session = await fetchAuthSession();
      assert.equal(session, null);
    },
  );
});

test("fetchAuthSession returns session on success", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/auth\/session$/);
      return jsonResponse(mockSession);
    },
    async () => {
      const session = await fetchAuthSession();
      assert.deepEqual(session, mockSession);
    },
  );
});

test("logoutWithConsole posts to logout route", async () => {
  await withFetchMock(
    (url, init) => {
      assert.match(url, /\/api\/auth\/logout$/);
      assert.equal(init?.method, "POST");
      return jsonResponse({ ok: true });
    },
    async () => {
      await logoutWithConsole();
    },
  );
});
