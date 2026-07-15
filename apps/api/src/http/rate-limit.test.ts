import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRateLimitMessage,
  checkNamedRateLimit,
  getRateLimitPolicy,
  resetRateLimitsForTests,
} from "./rate-limit";

test("named rate limit blocks after configured threshold", () => {
  resetRateLimitsForTests();

  const first = checkNamedRateLimit("auth.login", "127.0.0.1", {
    limit: 2,
    windowMs: 60_000,
  });
  const second = checkNamedRateLimit("auth.login", "127.0.0.1", {
    limit: 2,
    windowMs: 60_000,
  });
  const third = checkNamedRateLimit("auth.login", "127.0.0.1", {
    limit: 2,
    windowMs: 60_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSec >= 1);
  assert.match(buildRateLimitMessage("auth.login", third.retryAfterSec), /Too many login attempts/i);
});

test("named rate limit keeps policies isolated by name", () => {
  resetRateLimitsForTests();

  const login = checkNamedRateLimit("auth.login", "127.0.0.1", {
    limit: 1,
    windowMs: 60_000,
  });
  const register = checkNamedRateLimit("auth.register", "127.0.0.1", {
    limit: 1,
    windowMs: 60_000,
  });
  const blockedLogin = checkNamedRateLimit("auth.login", "127.0.0.1", {
    limit: 1,
    windowMs: 60_000,
  });

  assert.equal(login.allowed, true);
  assert.equal(register.allowed, true);
  assert.equal(blockedLogin.allowed, false);
});

test("rate limit policy reads environment overrides", () => {
  const previousLimit = process.env.RATE_LIMIT_PUBLIC_CHAT_IP_LIMIT;
  const previousWindow = process.env.RATE_LIMIT_PUBLIC_CHAT_IP_WINDOW_MS;
  process.env.RATE_LIMIT_PUBLIC_CHAT_IP_LIMIT = "9";
  process.env.RATE_LIMIT_PUBLIC_CHAT_IP_WINDOW_MS = "15000";

  try {
    const policy = getRateLimitPolicy("public.chat.ip");
    assert.equal(policy.limit, 9);
    assert.equal(policy.windowMs, 15000);
  } finally {
    if (previousLimit === undefined) {
      delete process.env.RATE_LIMIT_PUBLIC_CHAT_IP_LIMIT;
    } else {
      process.env.RATE_LIMIT_PUBLIC_CHAT_IP_LIMIT = previousLimit;
    }
    if (previousWindow === undefined) {
      delete process.env.RATE_LIMIT_PUBLIC_CHAT_IP_WINDOW_MS;
    } else {
      process.env.RATE_LIMIT_PUBLIC_CHAT_IP_WINDOW_MS = previousWindow;
    }
  }
});
