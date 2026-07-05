import type { ReconcileChunksResult } from "./rag.types";

export function getVectorReconcileMaxAttempts(
  env: Record<string, string | undefined> = process.env,
): number {
  const parsed = Number.parseInt(env.VECTOR_RECONCILE_MAX_ATTEMPTS ?? "3", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export function getVectorReconcileRetryDelayMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const parsed = Number.parseInt(env.VECTOR_RECONCILE_RETRY_DELAY_MS ?? "500", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
}

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    retryDelayMs: number;
    onRetry?: (input: { attempt: number; error: unknown }) => void;
  },
): Promise<{ value: T; attempts: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      const value = await operation();
      return { value, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= options.maxAttempts) {
        break;
      }
      options.onRetry?.({ attempt, error });
      await sleep(options.retryDelayMs * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Vector reconcile retry exhausted."));
}

export function toDegradedReconcileResult(input: {
  total: number;
  attempts: number;
  error: unknown;
}): ReconcileChunksResult {
  return {
    upserted: 0,
    deleted: 0,
    total: input.total,
    status: "degraded",
    attempts: input.attempts,
    error: input.error instanceof Error ? input.error.message : String(input.error),
  };
}
