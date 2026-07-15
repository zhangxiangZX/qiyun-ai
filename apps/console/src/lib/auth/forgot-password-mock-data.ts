/**
 * 找回密码 — Mock 数据与类型定义
 *
 * 模拟发送验证码与重置密码的后端行为。
 * 仅用于前端开发与演示，不涉及真实 API 调用。
 */

export interface ForgotPasswordState {
  step: 1 | 2 | 3;
  email: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
  isSending: boolean;
  countdown: number;
  isResetting: boolean;
  message: string;
  messageTone: "idle" | "success" | "error";
}

export const INITIAL_STATE: ForgotPasswordState = {
  step: 1,
  email: "",
  code: ["", "", "", "", "", ""],
  newPassword: "",
  confirmPassword: "",
  isSending: false,
  countdown: 0,
  isResetting: false,
  message: "",
  messageTone: "idle",
};

/** 模拟发送验证码 — 1.5s 延迟后返回成功 */
export async function mockSendVerificationCode(_email: string): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true };
}

/** 模拟重置密码 — 1.2s 延迟后返回成功 */
export async function mockResetPassword(_params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { success: true };
}

/** 密码强度评级 */
export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}

export const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  empty: "",
  weak: "弱",
  fair: "一般",
  good: "良好",
  strong: "强",
};

export const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  empty: "bg-slate-200",
  weak: "bg-red-500",
  fair: "bg-orange-400",
  good: "bg-blue-500",
  strong: "bg-green-500",
};

export const STRENGTH_BAR_WIDTH: Record<PasswordStrength, string> = {
  empty: "w-0",
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};
