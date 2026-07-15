/**
 * 首次登录强制修改密码 — Mock 数据与类型定义
 *
 * 模拟首次登录后强制修改密码的后端行为。
 * 仅用于前端开发与演示，不涉及真实 API 调用。
 */

/* ── 状态类型 ── */
export interface ForceResetState {
  /** 当前用户名（从 URL 或 mock 读取） */
  username: string;
  /** 当前邮箱（从 URL 或 mock 读取） */
  email: string;
  /** 新密码 */
  newPassword: string;
  /** 确认密码 */
  confirmPassword: string;
  /** 是否显示新密码 */
  showPassword: boolean;
  /** 是否显示确认密码 */
  showConfirmPassword: boolean;
  /** 是否正在提交 */
  isSubmitting: boolean;
  /** 是否修改成功 */
  isSuccess: boolean;
  /** 反馈消息 */
  message: string;
  /** 反馈消息色调 */
  messageTone: "idle" | "success" | "error";
}

/* ── 密码强度 ── */
export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

/**
 * 评估密码强度。
 *
 * 硬性要求：至少 8 位、至少包含 1 个数字和 1 个字母。
 * 不满足硬性要求 → "weak"（弱）
 *
 * 评分逻辑：
 *   - 满足硬性要求 → +1
 *   - 长度 ≥ 12 → +1
 *   - 同时包含大小写字母 → +1
 *   - 包含特殊字符 → +1
 *
 *  总分 ≤ 1 → "fair"（一般）
 *  总分 = 2 → "good"（强）
 *  总分 ≥ 3 → "strong"（很强）
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";

  const hasMinLength = password.length >= 8;
  const hasDigit = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z\d]/.test(password);
  const isLong = password.length >= 12;

  // 硬性要求：8 位 + 数字 + 字母
  if (!hasMinLength || !hasDigit || !hasLetter) return "weak";

  let score = 0;
  // 满足硬性要求
  score += 1;
  if (isLong) score += 1;
  if (hasUpperAndLower) score += 1;
  if (hasSpecial) score += 1;

  if (score <= 1) return "fair";
  if (score === 2) return "good";
  return "strong";
}

/** 校验密码是否满足硬性要求（8 位、含数字和字母） */
export function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
}

/** 校验确认密码是否匹配 */
export function isConfirmMatch(newPassword: string, confirmPassword: string): boolean {
  if (!confirmPassword) return true; // 未输入时不报错
  return newPassword === confirmPassword;
}

export const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  empty: "",
  weak: "弱",
  fair: "一般",
  good: "强",
  strong: "很强",
};

// 颜色：红 → 橙 → 绿 → 深绿
export const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  empty: "bg-slate-200",
  weak: "bg-red-500",
  fair: "bg-orange-400",
  good: "bg-green-500",
  strong: "bg-green-700",
};

export const STRENGTH_BAR_WIDTH: Record<PasswordStrength, string> = {
  empty: "w-0",
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};

export const STRENGTH_TEXT_COLORS: Record<PasswordStrength, string> = {
  empty: "text-slate-400",
  weak: "text-red-500",
  fair: "text-orange-500",
  good: "text-green-600",
  strong: "text-green-700",
};

/* ── 初始状态 ── */
export const INITIAL_STATE: ForceResetState = {
  username: "默认用户",
  email: "user@qiyun.ai",
  newPassword: "",
  confirmPassword: "",
  showPassword: false,
  showConfirmPassword: false,
  isSubmitting: false,
  isSuccess: false,
  message: "",
  messageTone: "idle",
};

/** 模拟 URL params 中可能传入的默认用户信息 */
export const MOCK_USER_INFO: Record<string, { username: string; email: string }> = {
  demo: { username: "张经理", email: "zhang@qiyun.ai" },
  admin: { username: "系统管理员", email: "admin@qiyun.ai" },
  sales: { username: "李销售", email: "li@qiyun.ai" },
};

/* ── Mock API ── */

/** 模拟强制修改密码 — 1.5s 延迟后返回成功 */
export async function mockForceResetPassword(_params: {
  newPassword: string;
}): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true };
}
