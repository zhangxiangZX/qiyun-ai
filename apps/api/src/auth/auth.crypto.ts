import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 30;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  activeWorkspaceId: string | null;
  type: "access";
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, expected] = passwordHash.split(":");
  if (!salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashOneTimeCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function signParts(parts: string[], secret: string): string {
  return createHmac("sha256", secret).update(parts.join(".")).digest("base64url");
}

export function createAccessToken(input: {
  userId: string;
  email: string;
  activeWorkspaceId: string | null;
  secret: string;
  now?: number;
}): { token: string; expiresInSeconds: number } {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: input.userId,
    email: input.email,
    activeWorkspaceId: input.activeWorkspaceId,
    type: "access",
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = signParts([header, body], input.secret);
  return {
    token: `${header}.${body}.${signature}`,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new Error("Malformed token.");
  }

  const expected = signParts([header, body], secret);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid token signature.");
  }

  const payload = fromBase64Url<AccessTokenPayload>(body);
  if (payload.type !== "access" || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired or invalid.");
  }

  return payload;
}

export function createRefreshToken(input: {
  userId: string;
  secret: string;
  now?: number;
}): {
  token: string;
  sessionId: string;
  expiresAt: string;
} {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const sessionId = `rs_${randomUUID()}`;
  const payload: RefreshTokenPayload = {
    sub: input.userId,
    sessionId,
    type: "refresh",
    exp: now + REFRESH_TOKEN_TTL_SECONDS,
  };
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = signParts([header, body], input.secret);
  return {
    token: `${header}.${body}.${signature}`,
    sessionId,
    expiresAt: new Date((now + REFRESH_TOKEN_TTL_SECONDS) * 1000).toISOString(),
  };
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new Error("Malformed token.");
  }

  const expected = signParts([header, body], secret);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid token signature.");
  }

  const payload = fromBase64Url<RefreshTokenPayload>(body);
  if (payload.type !== "refresh" || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Refresh token expired or invalid.");
  }

  return payload;
}
