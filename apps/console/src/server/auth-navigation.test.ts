import assert from "node:assert/strict";
import test from "node:test";

import {
  isPlatformAdminAllowedDashboardPath,
  resolveDashboardRedirect,
  resolveLoginRedirectForAuthenticatedUser,
} from "@/server/auth-navigation";

test("resolveLoginRedirectForAuthenticatedUser returns null for guests", () => {
  assert.equal(resolveLoginRedirectForAuthenticatedUser(false), null);
});

test("resolveLoginRedirectForAuthenticatedUser sends authenticated users to invite flow when token exists", () => {
  assert.equal(
    resolveLoginRedirectForAuthenticatedUser(true, "invite token"),
    "/accept-invite?token=invite%20token",
  );
});

test("resolveLoginRedirectForAuthenticatedUser sends authenticated users to dashboard by default", () => {
  assert.equal(resolveLoginRedirectForAuthenticatedUser(true), "/dashboard");
});

test("resolveLoginRedirectForAuthenticatedUser sends platform_admin to super-admin", () => {
  assert.equal(
    resolveLoginRedirectForAuthenticatedUser(true, undefined, "platform_admin"),
    "/dashboard/super-admin",
  );
});

test("resolveDashboardRedirect protects dashboard routes", () => {
  assert.equal(resolveDashboardRedirect(false), "/login");
  assert.equal(resolveDashboardRedirect(true), null);
});

test("platform_admin without workspace is forced to super-admin off allowed paths", () => {
  assert.equal(
    resolveDashboardRedirect(true, "platform_admin", {
      pathname: "/dashboard/inquiries",
      activeWorkspaceId: null,
    }),
    "/dashboard/super-admin",
  );
  assert.equal(
    resolveDashboardRedirect(true, "platform_admin", {
      pathname: "/dashboard/boss",
      activeWorkspaceId: "",
    }),
    "/dashboard/super-admin",
  );
  assert.equal(
    resolveDashboardRedirect(true, "platform_admin", {
      pathname: "/dashboard/super-admin",
      activeWorkspaceId: null,
    }),
    null,
  );
  assert.equal(
    resolveDashboardRedirect(true, "platform_admin", {
      pathname: "/dashboard/system-status",
      activeWorkspaceId: null,
    }),
    null,
  );
  assert.equal(
    resolveDashboardRedirect(true, "platform_admin", {
      pathname: "/dashboard/inquiries",
      activeWorkspaceId: "ws_1",
    }),
    null,
  );
});

test("isPlatformAdminAllowedDashboardPath recognizes platform routes", () => {
  assert.equal(isPlatformAdminAllowedDashboardPath("/dashboard/super-admin"), true);
  assert.equal(isPlatformAdminAllowedDashboardPath("/dashboard/super-admin/tenants"), true);
  assert.equal(isPlatformAdminAllowedDashboardPath("/dashboard/system-status"), true);
  assert.equal(isPlatformAdminAllowedDashboardPath("/dashboard/inquiries"), false);
});
