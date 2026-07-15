import { getRateLimitMessage, isRateLimited } from "@/lib/api/errors";

export const AUTH_VALIDATION = {
  emailRequired: "请输入工作邮箱。",
  emailInvalid: "请输入有效的工作邮箱。",
  passwordRequired: "请输入密码。",
  passwordMinLogin: "密码至少需要 6 位。",
  passwordMinReset: "新密码至少需要 6 位。",
  passwordMinRegister: "密码至少需要 8 位，且同时包含数字和字母。",
  passwordMinForceChange: "新密码至少需要 8 位，且同时包含数字和字母。",
  codeRequired: "请输入 6 位验证码。",
  codeIncomplete: "请输入完整的 6 位验证码。",
  termsRequired: "请先同意用户协议与隐私政策。",
  passwordMismatch: "两次输入的密码不一致。",
  nameRequired: "请输入姓名。",
} as const;

const ENGLISH_AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid email or password.": "邮箱或密码错误，请检查后重试。",
  "Unable to sign in.": "登录失败，请检查邮箱和密码后重试。",
  "Unable to create account.": "注册失败，请稍后重试。",
  "Unable to send verification code.": "验证码发送失败，请稍后重试。",
  "Unable to verify code.": "验证码校验失败，请稍后重试。",
  "Unable to send reset code.": "验证码发送失败，请稍后重试。",
  "Unable to reset password.": "密码重置失败，请稍后重试。",
  "Unable to load session.": "无法加载登录状态，请刷新页面后重试。",
  "Verification code is incorrect.": "验证码错误或已过期，请重新获取。",
  "Verification code is incorrect or has expired.": "验证码错误或已过期，请重新获取。",
  "Verification code must be 6 digits.": "验证码须为 6 位数字。",
  "Password must be at least 6 characters.": AUTH_VALIDATION.passwordMinReset,
  "Email already exists.": "该邮箱已注册，请直接登录或使用验证码登录。",
  "Email, password, and name are required.": "请填写姓名、邮箱和密码。",
  "A valid email is required.": AUTH_VALIDATION.emailInvalid,
};

export function localizeAuthError(error: unknown, fallback: string): string {
  if (isRateLimited(error)) {
    return getRateLimitMessage(error);
  }

  if (error instanceof Error) {
    const mapped = ENGLISH_AUTH_ERROR_MAP[error.message.trim()];
    if (mapped) return mapped;
    if (/[\u4e00-\u9fff]/.test(error.message)) return error.message;
  }

  return fallback;
}

export function isStrongPasswordForRegister(password: string): boolean {
  return password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
}
