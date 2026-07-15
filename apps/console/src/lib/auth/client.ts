"use client";

import { unwrapEnvelope } from "@/lib/api/envelope";
import { apiRequest } from "@/lib/api/client";

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  activeWorkspaceId: string | null;
  platformRole?: "platform_admin" | null;
  /** 首次登录强制改密标记：为 true 时登录后必须跳转到 /reset-password 改密后才能进入控制台 */
  mustChangePassword?: boolean;
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
  deliveryMode?: "simulated" | "email";
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

const AUTH_FALLBACKS = {
  login: "登录失败，请检查邮箱和密码后重试。",
  register: "注册失败，请稍后重试。",
  codeRequest: "验证码发送失败，请稍后重试。",
  codeVerify: "验证码校验失败，请稍后重试。",
  resetRequest: "验证码发送失败，请稍后重试。",
  resetConfirm: "密码重置失败，请稍后重试。",
  session: "无法加载登录状态，请刷新页面后重试。",
} as const;

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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.login));
  }

  return unwrapEnvelope<AuthSession>(await response.json());
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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.register));
  }

  return unwrapEnvelope<AuthSession>(await response.json());
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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.codeRequest));
  }

  return unwrapEnvelope<LoginCodeRequestResult>(await response.json());
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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.codeVerify));
  }

  return unwrapEnvelope<AuthSession>(await response.json());
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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.resetRequest));
  }

  return unwrapEnvelope<LoginCodeRequestResult>(await response.json());
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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.resetConfirm));
  }

  return unwrapEnvelope<PasswordResetResult>(await response.json());
}

/**
 * 首次登录强制改密 —— 已登录用户修改自己的密码。
 * 成功后后端应重新下发 auth cookie（含 mustChangePassword:false），
 * 这样 /dashboard 布局守卫才不会把用户再次弹回 /reset-password（避免死循环）。
 */
export async function changePasswordWithConsole(input: {
  newPassword: string;
}): Promise<AuthSession> {
  return apiRequest<AuthSession>("/auth/change-password", {
    method: "POST",
    body: input,
  });
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
    throw new Error(await parseMessage(response, AUTH_FALLBACKS.session));
  }

  return unwrapEnvelope<AuthSession>(await response.json());
}

export async function logoutWithConsole(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
  });
}
