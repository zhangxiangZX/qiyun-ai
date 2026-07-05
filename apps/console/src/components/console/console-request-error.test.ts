import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRequestErrorKind,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { ApiError } from "@/lib/api/errors";

test("resolveRequestErrorKind classifies permission failures", () => {
  assert.equal(resolveRequestErrorKind(new ApiError(401, "UNAUTHORIZED", "No session")), "permission");
  assert.equal(resolveRequestErrorKind(new ApiError(403, "UNAUTHORIZED", "Forbidden")), "permission");
});

test("resolveRequestErrorKind classifies network failures", () => {
  assert.equal(resolveRequestErrorKind(new ApiError(502, "INTERNAL_ERROR", "Bad gateway")), "network");
  assert.equal(resolveRequestErrorKind(new ApiError(500, "INTERNAL_ERROR", "Server error")), "network");
});

test("resolveRequestErrorKind classifies preview mode", () => {
  assert.equal(resolveRequestErrorKind(new ApiError(503, "PREVIEW_MODE", "Preview only")), "preview");
});

test("resolveRequestErrorKind classifies rate limits", () => {
  assert.equal(resolveRequestErrorKind(new ApiError(429, "RATE_LIMITED", "retry in 5s")), "rateLimit");
});

test("resolveRequestErrorPresentation returns localized rate-limit copy", () => {
  const result = resolveRequestErrorPresentation(
    new ApiError(429, "RATE_LIMITED", "retry in 9s"),
    "fallback",
  );
  assert.equal(result.kind, "rateLimit");
  assert.equal(result.message, "retry in 9s");
});
