"use client";

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  activeWorkspaceId: string | null;
  platformRole?: "platform_admin" | null;
}

export interface AuthWorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  isActive: boolean;
}

export interface AuthSession {
  authenticated: boolean;
  user: AuthSessionUser;
  workspaces: AuthWorkspaceSummary[];
}

export interface LoginCodeRequestResult {
  sent: true;
  expiresAt: string;
  debugCode?: string;
}

export interface PasswordResetResult {
  reset: true;
}

async function parseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;
  return payload?.message || fallback;
}

export async function loginWithConsole(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to sign in."));
  }

  return (await response.json()) as AuthSession;
}

export async function registerWithConsole(input: {
  email: string;
  password: string;
  name: string;
  workspaceName?: string;
  invitationToken?: string;
}): Promise<AuthSession> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to create account."));
  }

  return (await response.json()) as AuthSession;
}

export async function requestLoginCodeWithConsole(input: {
  email: string;
}): Promise<LoginCodeRequestResult> {
  const response = await fetch("/api/auth/code/request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to send verification code."));
  }

  return (await response.json()) as LoginCodeRequestResult;
}

export async function verifyLoginCodeWithConsole(input: {
  email: string;
  code: string;
}): Promise<AuthSession> {
  const response = await fetch("/api/auth/code/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to verify code."));
  }

  return (await response.json()) as AuthSession;
}

export async function requestPasswordResetWithConsole(input: {
  email: string;
}): Promise<LoginCodeRequestResult> {
  const response = await fetch("/api/auth/password-reset/request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to send reset code."));
  }

  return (await response.json()) as LoginCodeRequestResult;
}

export async function confirmPasswordResetWithConsole(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<PasswordResetResult> {
  const response = await fetch("/api/auth/password-reset/confirm", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to reset password."));
  }

  return (await response.json()) as PasswordResetResult;
}

export async function fetchAuthSession(): Promise<AuthSession | null> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to load session."));
  }

  return (await response.json()) as AuthSession;
}

export async function logoutWithConsole(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
  });
}
