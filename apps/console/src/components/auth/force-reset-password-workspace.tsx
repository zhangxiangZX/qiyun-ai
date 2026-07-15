"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { Button, Input, Label, Alert } from "@qiyun/ui";

import { changePasswordWithConsole } from "@/lib/auth/client";
import { BRAND_NAME } from "@/lib/brand";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import { AUTH_VALIDATION, localizeAuthError } from "@/lib/auth/messages";
import {
  INITIAL_STATE,
  MOCK_USER_INFO,
  mockForceResetPassword,
  getPasswordStrength,
  isPasswordValid,
  isConfirmMatch,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
  STRENGTH_BAR_WIDTH,
  STRENGTH_TEXT_COLORS,
  type ForceResetState,
  type PasswordStrength,
} from "@/lib/auth/reset-password-mock-data";

/* ── 密码强度指示条 ── */
function PasswordStrengthBar({ strength }: { strength: PasswordStrength }) {
  if (strength === "empty") return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${STRENGTH_BAR_WIDTH[strength]} ${STRENGTH_COLORS[strength]}`}
        />
      </div>
      <p className={`text-xs font-medium ${STRENGTH_TEXT_COLORS[strength]}`}>
        密码强度：{STRENGTH_LABELS[strength]}
      </p>
      {strength === "weak" && (
        <p className="text-xs text-slate-400">
          密码需至少 8 位，且同时包含数字和字母
        </p>
      )}
    </div>
  );
}

/* ── 顶部返回栏 ── */
function TopBar() {
  return (
    <div className="flex items-center justify-between px-8 py-6 text-sm text-slate-500 sm:px-12">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-[#2563eb]"
      >
        <ArrowRight className="h-4 w-4 rotate-180" />
        <span>返回登录</span>
      </Link>
      <span className="text-xs text-slate-400">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
        安全设置
      </span>
    </div>
  );
}

/* ── 成功态 ── */
function SuccessView({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center py-6">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">密码设置成功</h2>
      <p className="mt-2 text-center text-sm text-slate-500">
        您的账号密码已更新，现在可以进入控制台
      </p>
      <Button
        size="lg"
        className="mt-8 h-11 w-full bg-[#2563eb] text-base hover:bg-[#1d4ed8]"
        rightIcon={<ArrowRight className="h-4 w-4" />}
        onClick={onEnter}
      >
        进入控制台
      </Button>
    </div>
  );
}

/* ── 密码图标 Decorative ── */
function ShieldIcon() {
  return (
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10">
      <ShieldCheck className="h-6 w-6 text-[#2563eb]" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   主组件
   ══════════════════════════════════════════════════════════ */
export function ForceResetPasswordWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* 从 URL 读取用户信息，否则回落 mock */
  const paramUser = searchParams.get("user");
  const paramUsername = searchParams.get("username");
  const paramEmail = searchParams.get("email");

  const resolvedUser = (() => {
    if (paramUsername || paramEmail) {
      return {
        username: paramUsername || paramEmail || "用户",
        email: paramEmail || "",
      };
    }
    if (paramUser && MOCK_USER_INFO[paramUser]) {
      return MOCK_USER_INFO[paramUser];
    }
    return { username: INITIAL_STATE.username, email: INITIAL_STATE.email };
  })();

  const [state, setState] = useState<ForceResetState>({
    ...INITIAL_STATE,
    username: resolvedUser.username,
    email: resolvedUser.email,
  });

  const strength = getPasswordStrength(state.newPassword);
  const canSubmit =
    isPasswordValid(state.newPassword) &&
    state.newPassword === state.confirmPassword &&
    !state.isSubmitting;

  /* ── 提交 ── */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setState((prev) => ({
      ...prev,
      isSubmitting: true,
      message: "",
      messageTone: "idle",
    }));

    try {
      try {
        // 真实后端：已登录用户改密，成功后后端重发 cookie（mustChangePassword:false）
        await changePasswordWithConsole({ newPassword: state.newPassword });
      } catch (error) {
        if (isPreviewModeError(error)) {
          // 预览/演示模式无真实后端，走 mock
          await mockForceResetPassword({ newPassword: state.newPassword });
        } else {
          throw error;
        }
      }
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        message: "",
        messageTone: "idle",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        message: localizeAuthError(error, "密码修改失败，请稍后重试。"),
        messageTone: "error",
      }));
    }
  }, [canSubmit, state.newPassword]);

  const handleEnterConsole = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  /* ── 确认密码不匹配提示 ── */
  const confirmMismatch =
    state.confirmPassword.length > 0 &&
    !isConfirmMatch(state.newPassword, state.confirmPassword);

  return (
    <div className="flex min-h-dvh w-full bg-gradient-to-br from-slate-50 to-blue-50/30">
      <main className="flex flex-1 flex-col">
        <TopBar />

        {/* 居中卡片 */}
        <div className="flex flex-1 items-start justify-center px-6 pt-16">
          <div className="w-full max-w-[420px]">
            {/* 卡片 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(30,58,138,0.25)]">
              {/* ── 成功态 ── */}
              {state.isSuccess ? (
                <SuccessView onEnter={handleEnterConsole} />
              ) : (
                <>
                  {/* 标题区 */}
                  <div className="mb-6 text-center">
                    <ShieldIcon />
                    <h1 className="text-xl font-bold text-slate-900">设置新密码</h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                      首次登录，请设置新密码以确保账户安全
                    </p>
                  </div>

                  {/* 安全提示 Alert */}
                  <Alert variant="info" className="mb-6">
                    {AUTH_VALIDATION.passwordMinForceChange}
                  </Alert>

                  {/* 当前用户信息 */}
                  <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10">
                      <Key className="h-4 w-4 text-[#2563eb]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {state.username}
                      </p>
                      {state.email && (
                        <p className="truncate text-xs text-slate-500">{state.email}</p>
                      )}
                    </div>
                  </div>

                  {/* 表单 */}
                  <div className="space-y-4">
                    {/* 新密码 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                        新密码
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="new-password"
                          type={state.showPassword ? "text" : "password"}
                          value={state.newPassword}
                          disabled={state.isSubmitting}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                              message: "",
                              messageTone: "idle",
                            }))
                          }
                          placeholder="请输入新密码（至少 8 位，含数字和字母）"
                          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-10 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-50"
                          autoComplete="new-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              showPassword: !prev.showPassword,
                            }))
                          }
                          disabled={state.isSubmitting}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed"
                          aria-label={state.showPassword ? "隐藏密码" : "显示密码"}
                        >
                          {state.showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* 密码强度指示条 */}
                      <PasswordStrengthBar strength={strength} />
                    </div>

                    {/* 确认密码 */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="confirm-password"
                        className="text-sm font-medium text-slate-700"
                      >
                        确认密码
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="confirm-password"
                          type={state.showConfirmPassword ? "text" : "password"}
                          value={state.confirmPassword}
                          disabled={state.isSubmitting}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                              message: "",
                              messageTone: "idle",
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && canSubmit) handleSubmit();
                          }}
                          placeholder="请再次输入新密码"
                          className={`h-11 w-full rounded-lg border bg-slate-50/60 py-2 pl-10 pr-10 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                            confirmMismatch
                              ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                              : state.confirmPassword &&
                                  state.confirmPassword === state.newPassword
                                ? "border-green-300 focus:border-green-400 focus:ring-green-200"
                                : "border-slate-200 focus:border-[#2563eb] focus:ring-[#2563eb]/20"
                          }`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              showConfirmPassword: !prev.showConfirmPassword,
                            }))
                          }
                          disabled={state.isSubmitting}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed"
                          aria-label={state.showConfirmPassword ? "隐藏密码" : "显示密码"}
                        >
                          {state.showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* 确认密码反馈 */}
                      {confirmMismatch && (
                        <p className="text-xs text-red-500">两次输入的密码不一致</p>
                      )}
                      {state.confirmPassword &&
                        state.confirmPassword === state.newPassword &&
                        isPasswordValid(state.newPassword) && (
                          <p className="text-xs text-green-600">密码匹配</p>
                        )}
                    </div>

                    {/* 提交按钮 */}
                    <Button
                      size="lg"
                      loading={state.isSubmitting}
                      disabled={!canSubmit}
                      className="h-11 w-full bg-[#2563eb] text-base hover:bg-[#1d4ed8]"
                      onClick={handleSubmit}
                    >
                      {state.isSubmitting ? "正在修改..." : "确认修改"}
                    </Button>

                    {/* 反馈消息 */}
                    {state.message && (
                      <p
                        className={`rounded-lg px-3 py-2 text-xs ${
                          state.messageTone === "error"
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-600"
                        }`}
                        role={state.messageTone === "error" ? "alert" : "status"}
                      >
                        {state.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 页脚 */}
            <p className="mt-6 text-center text-xs text-slate-400">
              © 2026 {BRAND_NAME} 版权所有{" "}
              <span className="mx-2 text-slate-300">|</span> 浙ICP备12345678号
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
