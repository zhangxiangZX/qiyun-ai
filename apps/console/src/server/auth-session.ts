import type { NextRequest, NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";

export interface ConsoleAuthUser {
  id: string;
  email: string;
  name: string;
  activeWorkspaceId: string | null;
  platformRole?: "platform_admin" | null;
}

export interface ConsoleWorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  isActive: boolean;
}

export interface ConsoleAuthPayload {
  user: ConsoleAuthUser;
  workspaces: ConsoleWorkspaceSummary[];
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
  };
}

export const AUTH_ACCESS_COOKIE = "qiyun_access_token";
export const AUTH_REFRESH_COOKIE = "qiyun_refresh_token";
export const AUTH_USER_COOKIE = "qiyun_auth_user";

function cookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function getConsoleAuthApiBaseUrl(): string {
  return getUpstreamApiBaseUrl() ?? "http://localhost:3001";
}

export function setAuthCookies(response: NextResponse, payload: ConsoleAuthPayload): void {
  response.cookies.set(
    AUTH_ACCESS_COOKIE,
    payload.tokens.accessToken,
    cookieOptions(payload.tokens.expiresInSeconds),
  );
  response.cookies.set(
    AUTH_REFRESH_COOKIE,
    payload.tokens.refreshToken,
    cookieOptions(60 * 60 * 24 * 30),
  );
  response.cookies.set(
    AUTH_USER_COOKIE,
    encodeURIComponent(JSON.stringify(payload.user)),
    cookieOptions(payload.tokens.expiresInSeconds),
  );
}

export function cookieOptionsForUser(maxAgeSeconds = 60 * 60 * 8) {
  return cookieOptions(maxAgeSeconds);
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(AUTH_ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(AUTH_USER_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export function getAuthAccessToken(request: NextRequest): string | null {
  return request.cookies.get(AUTH_ACCESS_COOKIE)?.value ?? null;
}

export function getAuthRefreshToken(request: NextRequest): string | null {
  return request.cookies.get(AUTH_REFRESH_COOKIE)?.value ?? null;
}

export function parseAuthUserCookieValue(value: string | null | undefined): ConsoleAuthUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as ConsoleAuthUser;
  } catch {
    return null;
  }
}

export function getAuthUser(request: NextRequest): ConsoleAuthUser | null {
  return parseAuthUserCookieValue(request.cookies.get(AUTH_USER_COOKIE)?.value);
}

export async function refreshAuthPayload(
  refreshToken: string,
): Promise<ConsoleAuthPayload | null> {
  try {
    const response = await fetch(`${getConsoleAuthApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ConsoleAuthPayload;
  } catch {
    return null;
  }
}

export async function resolveAccessToken(
  request: NextRequest,
): Promise<{ accessToken: string; refreshed?: ConsoleAuthPayload } | null> {
  const existing = getAuthAccessToken(request);
  if (existing) {
    return { accessToken: existing };
  }

  const refreshToken = getAuthRefreshToken(request);
  if (!refreshToken) {
    return null;
  }

  const payload = await refreshAuthPayload(refreshToken);
  if (!payload?.tokens?.accessToken) {
    return null;
  }

  return {
    accessToken: payload.tokens.accessToken,
    refreshed: payload,
  };
}

export function applyRefreshedAuthCookies(
  response: NextResponse,
  payload: ConsoleAuthPayload,
): void {
  setAuthCookies(response, payload);
}
