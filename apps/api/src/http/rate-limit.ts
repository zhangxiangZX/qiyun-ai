interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export type RateLimitPolicyName =
  | "auth.register"
  | "auth.login"
  | "auth.code.request"
  | "auth.code.verify"
  | "auth.password-reset.request"
  | "auth.password-reset.confirm"
  | "auth.trial.request"
  | "auth.refresh"
  | "auth.change-password"
  | "workspace.invite"
  | "workspace.invitation.accept"
  | "workspace.invitation.resend"
  | "sites.test-message"
  | "public.chat.ip"
  | "public.leads.ip"
  | "public.leads.attachments.ip"
  | "api.global.ip";

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  messagePrefix: string;
}

const DEFAULT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
  "auth.register": {
    limit: 10,
    windowMs: 60_000,
    messagePrefix: "Too many registration attempts.",
  },
  "auth.login": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many login attempts.",
  },
  "auth.code.request": {
    limit: 10,
    windowMs: 60_000,
    messagePrefix: "Too many verification code requests.",
  },
  "auth.code.verify": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many verification attempts.",
  },
  "auth.password-reset.request": {
    limit: 10,
    windowMs: 60_000,
    messagePrefix: "Too many password reset requests.",
  },
  "auth.password-reset.confirm": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many password reset attempts.",
  },
  "auth.trial.request": {
    limit: 8,
    windowMs: 60_000,
    messagePrefix: "Too many trial requests.",
  },
  "auth.refresh": {
    limit: 30,
    windowMs: 60_000,
    messagePrefix: "Too many refresh attempts.",
  },
  "auth.change-password": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many password change attempts.",
  },
  "workspace.invite": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many invitation requests.",
  },
  "workspace.invitation.accept": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many invitation accept attempts.",
  },
  "workspace.invitation.resend": {
    limit: 20,
    windowMs: 60_000,
    messagePrefix: "Too many invitation resend attempts.",
  },
  "sites.test-message": {
    limit: 12,
    windowMs: 60_000,
    messagePrefix: "Too many site test messages.",
  },
  "public.chat.ip": {
    limit: 120,
    windowMs: 60_000,
    messagePrefix: "Too many public chat requests.",
  },
  "public.leads.ip": {
    limit: 30,
    windowMs: 60_000,
    messagePrefix: "Too many public lead submissions.",
  },
  "public.leads.attachments.ip": {
    limit: 60,
    windowMs: 60_000,
    messagePrefix: "Too many public lead attachment uploads.",
  },
  "api.global.ip": {
    limit: 600,
    windowMs: 60_000,
    messagePrefix: "Too many requests.",
  },
};

function envKey(name: RateLimitPolicyName, kind: "limit" | "windowMs"): string {
  const suffix = kind === "limit" ? "LIMIT" : "WINDOW_MS";
  const normalized = name.replaceAll(".", "_").replaceAll("-", "_").toUpperCase();
  return `RATE_LIMIT_${normalized}_${suffix}`;
}

function readNumberEnv(key: string): number | null {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function getRateLimitPolicy(name: RateLimitPolicyName): RateLimitPolicy {
  const fallback = DEFAULT_POLICIES[name];
  return {
    limit: readNumberEnv(envKey(name, "limit")) ?? fallback.limit,
    windowMs: readNumberEnv(envKey(name, "windowMs")) ?? fallback.windowMs,
    messagePrefix: fallback.messagePrefix,
  };
}

export function checkNamedRateLimit(
  name: RateLimitPolicyName,
  key: string,
  input?: Partial<Pick<RateLimitPolicy, "limit" | "windowMs">>,
): { allowed: boolean; retryAfterSec: number; policy: RateLimitPolicy } {
  const policy = getRateLimitPolicy(name);
  const resolved = {
    ...policy,
    limit: input?.limit ?? policy.limit,
    windowMs: input?.windowMs ?? policy.windowMs,
  };
  const result = checkRateLimit(`${name}:${key}`, resolved.limit, resolved.windowMs);
  return {
    ...result,
    policy: resolved,
  };
}

export function buildRateLimitMessage(
  name: RateLimitPolicyName,
  retryAfterSec: number,
): string {
  const policy = getRateLimitPolicy(name);
  return `${policy.messagePrefix} Retry in ${retryAfterSec}s.`;
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
