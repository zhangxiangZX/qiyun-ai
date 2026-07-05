import assert from "node:assert/strict";
import test from "node:test";

import { retryAsync, toDegradedReconcileResult } from "./vector-reconcile";

test("retryAsync succeeds on first attempt", async () => {
  let calls = 0;
  const result = await retryAsync(
    async () => {
      calls += 1;
      return "ok";
    },
    { maxAttempts: 3, retryDelayMs: 0 },
  );

  assert.equal(result.value, "ok");
  assert.equal(result.attempts, 1);
  assert.equal(calls, 1);
});

test("retryAsync retries until success", async () => {
  let calls = 0;
  const result = await retryAsync(
    async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error("transient");
      }
      return "ok";
    },
    { maxAttempts: 3, retryDelayMs: 0 },
  );

  assert.equal(result.value, "ok");
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
});

test("retryAsync throws after max attempts", async () => {
  await assert.rejects(
  retryAsync(
    async () => {
      throw new Error("permanent");
    },
    { maxAttempts: 2, retryDelayMs: 0 },
  ),
  /permanent/,
  );
});

test("toDegradedReconcileResult preserves error message", () => {
  const result = toDegradedReconcileResult({
    total: 4,
    attempts: 3,
    error: new Error("qdrant down"),
  });

  assert.equal(result.status, "degraded");
  assert.equal(result.total, 4);
  assert.equal(result.attempts, 3);
  assert.equal(result.error, "qdrant down");
  assert.equal(result.upserted, 0);
});
