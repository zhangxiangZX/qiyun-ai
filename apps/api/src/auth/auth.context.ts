import type { RequestContext } from "../workspace";
import type { AuthApi } from "./auth.api";
import { AuthAccessError } from "./auth.api";

export function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization")?.trim();
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export async function requireAuthContext(
  headers: Headers,
  authApi: AuthApi,
): Promise<RequestContext> {
  const token = getBearerToken(headers);
  if (!token) {
    throw new AuthAccessError("Missing bearer token.");
  }

  const user = await authApi.authenticate(token);
  const requestedWorkspaceId = headers.get("x-workspace-id")?.trim() || null;
  const workspaceId = requestedWorkspaceId || user.activeWorkspaceId;
  if (!workspaceId) {
    throw new AuthAccessError("No active workspace is set.");
  }

  const workspace = await authApi.assertWorkspaceAccess(user.id, workspaceId);

  return {
    userId: user.id,
    workspaceId,
    role: workspace.role,
  };
}
