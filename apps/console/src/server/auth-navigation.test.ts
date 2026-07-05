import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("resolveDashboardRedirect protects dashboard routes", () => {
  assert.equal(resolveDashboardRedirect(false), "/login");
  assert.equal(resolveDashboardRedirect(true), null);
});
