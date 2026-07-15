import { NextRequest, NextResponse } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  applyRefreshedAuthCookies,
  clearAuthCookies,
  getAuthAccessToken,
  getAuthRefreshToken,
  getAuthUser,
  getConsoleAuthApiBaseUrl,
  refreshAuthPayload,
  type ConsoleAuthUser,
  type ConsoleWorkspaceSummary,
} from "@/server/auth-session";

function buildDegradedWorkspaces(user: ConsoleAuthUser): ConsoleWorkspaceSummary[] {
  if (!user.activeWorkspaceId) {
    return [];
  }

  return [
    {
      id: user.activeWorkspaceId,
      name: "当前工作区",
      slug: user.activeWorkspaceId,
      role: "owner",
      isActive: true,
    },
  ];
}

async function refreshUserFromUpstream(
  accessToken: string,
): Promise<ConsoleAuthUser | null> {
  try {
    const response = await fetch(`${getConsoleAuthApiBaseUrl()}/auth/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = unwrapEnvelope<{ user?: ConsoleAuthUser }>(await response.json());
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  let user = getAuthUser(request);
  let accessToken = getAuthAccessToken(request);
  let refreshedPayload = null;

  if (!accessToken) {
    const refreshToken = getAuthRefreshToken(request);
    if (refreshToken) {
      refreshedPayload = await refreshAuthPayload(refreshToken);
      if (refreshedPayload) {
        accessToken = refreshedPayload.tokens.accessToken;
        user = refreshedPayload.user;
      }
    }
  }

  if (!user || !accessToken) {
    const response = NextResponse.json(
      { code: "UNAUTHORIZED", message: "No active session." },
      { status: 401 },
    );
    if (!getAuthRefreshToken(request)) {
      clearAuthCookies(response);
    }
    return response;
  }

  const freshUser = await refreshUserFromUpstream(accessToken);
  if (freshUser) {
    user = freshUser;
  }

  try {
    const workspacesResponse = await fetch(`${getConsoleAuthApiBaseUrl()}/workspaces`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (workspacesResponse.ok) {
      const workspaces = unwrapEnvelope<ConsoleWorkspaceSummary[]>(
        await workspacesResponse.json(),
      );
      const response = NextResponse.json({
        authenticated: true,
        user,
        workspaces,
      });
      if (refreshedPayload) {
        applyRefreshedAuthCookies(response, refreshedPayload);
      }
      return response;
    }
  } catch {
    // Upstream unreachable — return cookie session below.
  }

  const response = NextResponse.json({
    authenticated: true,
    user,
    workspaces: buildDegradedWorkspaces(user),
    degraded: true,
  });
  if (refreshedPayload) {
    applyRefreshedAuthCookies(response, refreshedPayload);
  }
  return response;
}
