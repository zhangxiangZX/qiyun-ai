import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiError,
  getApiErrorMessage,
  getRateLimitMessage,
  isApiError,
  isRateLimited,
  normalizeApiErrorCode,
} from "@/lib/api/errors";

test("normalizeApiErrorCode maps HTTP statuses", () => {
  assert.equal(normalizeApiErrorCode(401), "UNAUTHORIZED");
  assert.equal(normalizeApiErrorCode(403), "UNAUTHORIZED");
  assert.equal(normalizeApiErrorCode(404), "NOT_FOUND");
  assert.equal(normalizeApiErrorCode(429), "RATE_LIMITED");
  assert.equal(normalizeApiErrorCode(503), "PREVIEW_MODE");
  assert.equal(normalizeApiErrorCode(500), "INTERNAL_ERROR");
});

test("isRateLimited detects ApiError and message heuristics", () => {
  assert.equal(isRateLimited(new ApiError(429, "RATE_LIMITED", "Too many requests")), true);
  assert.equal(isRateLimited(new Error("rate limit exceeded")), true);
  assert.equal(isRateLimited(new Error("请求过于频繁")), true);
  assert.equal(isRateLimited(new ApiError(500, "INTERNAL_ERROR", "Server error")), false);
});

test("getApiErrorMessage prefers ApiError message", () => {
  const error = new ApiError(500, "INTERNAL_ERROR", "Upstream exploded.");
  assert.equal(getApiErrorMessage(error, "fallback"), "Upstream exploded.");
  assert.equal(getApiErrorMessage(new Error("plain"), "fallback"), "plain");
  assert.equal(getApiErrorMessage(null, "fallback"), "fallback");
});

test("getRateLimitMessage formats retry hints", () => {
  assert.equal(
    getRateLimitMessage(new ApiError(429, "RATE_LIMITED", "retry in 12s")),
    "retry in 12s",
  );
  assert.equal(
    getRateLimitMessage(new ApiError(429, "RATE_LIMITED", "wait 8 s")),
    "请求过于频繁，请 8 秒后再试。",
  );
});

test("isApiError narrows ApiError instances", () => {
  const error = new ApiError(404, "NOT_FOUND", "Missing");
  assert.equal(isApiError(error), true);
  assert.equal(isApiError(new Error("nope")), false);
});
