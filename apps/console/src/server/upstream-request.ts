import type { NextRequest } from "next/server";

import {
  resolveAccessToken,
  type ConsoleAuthPayload,
} from "@/server/auth-session";
import { getWorkspaceContext } from "@/server/workspace";

export interface UpstreamHeadersOptions {
  /** Default `true`. When set, missing session token yields `null`. */
  requireAuth?: boolean;
}

export interface UpstreamHeadersResult {
  headers: Headers;
  refreshed?: ConsoleAuthPayload;
}

export async function buildUpstreamHeaders(
  request: NextRequest,
  options: UpstreamHeadersOptions = {},
): Promise<UpstreamHeadersResult | null> {
  const requireAuth = options.requireAuth !== false;
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const auth = await resolveAccessToken(request);
  if (auth?.accessToken) {
    headers.set("authorization", `Bearer ${auth.accessToken}`);
  } else if (requireAuth) {
    return null;
  }

  const workspaceId =
    auth?.refreshed?.user.activeWorkspaceId?.trim() ||
    getWorkspaceContext(request).workspaceId;
  headers.set("x-workspace-id", workspaceId);
  return {
    headers,
    refreshed: auth?.refreshed,
  };
}
