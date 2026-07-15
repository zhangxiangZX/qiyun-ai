"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Key, CheckCircle2, ArrowLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button, Input, Label } from "@qiyun/ui";

import { BRAND_NAME } from "@/lib/brand";
import {
  confirmPasswordResetWithConsole,
  requestPasswordResetWithConsole,
} from "@/lib/auth/client";
import { AUTH_VALIDATION, localizeAuthError } from "@/lib/auth/messages";
import {
  INITIAL_STATE,
  getPasswordStrength,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
  STRENGTH_BAR_WIDTH,
  type ForgotPasswordState,
} from "@/lib/auth/forgot-password-mock-data";

/* ── 步骤指示器 ── */
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: "输入邮箱" },
    { num: 2, label: "验证身份" },
    { num: 3, label: "重置成功" },
  ];

  return (
    <nav aria-label="找回密码步骤" className="mb-8">
      <ol className="flex items-center justify-center gap-0">
        {steps.map((s, i) => {
          const isActive = step === s.num;
          const isDone = step > s.num;

          return (
            <li key={s.num} className="flex items-center">
              {/* 圆点 + 标签 */}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-[#2563eb] text-white shadow-[0_0_12px_rgba(37,99,235,0.45)] scale-110"
                      : isDone
                        ? "bg-[#2563eb]/20 text-[#2563eb]"
                        : "bg-slate-100 text-slate-400"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    s.num
                  )}
                </span>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "text-[#2563eb]"
                      : isDone
                        ? "text-[#2563eb]/70"
                        : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {/* 连线 */}
              {i < steps.length - 1 && (
                <div
                  className={`mx-3 h-0.5 w-10 rounded-full transition-colors duration-300 ${
                    step > s.num ? "bg-[#2563eb]/40" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── 验证码输入 ── */
interface CodeInputsProps {
  code: string[];
  onChange: (index: number, value: string) => void;
  disabled: boolean;
}

function CodeInputs({ code, onChange, disabled }: CodeInputsProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusNext = useCallback(
    (index: number) => {
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [],
  );

  const focusPrev = useCallback(
    (index: number) => {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [],
  );

  const handleChange = useCallback(
    (index: number, value: string) => {
      const cleaned = value.replace(/\D/g, "").slice(0, 1);
      if (!cleaned) return;

      onChange(index, cleaned);
      focusNext(index);
    },
    [onChange, focusNext],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !code[index]) {
        focusPrev(index);
      } else if (e.key === "ArrowLeft") {
        focusPrev(index);
      } else if (e.key === "ArrowRight") {
        focusNext(index);
      }
    },
    [code, focusPrev, focusNext],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;

      for (let i = 0; i < 6; i++) {
        onChange(i, pasted[i] ?? "");
      }

      // 聚焦到最后一个有值的输入框之后
      const lastIndex = Math.min(pasted.length, 5);
      inputRefs.current[lastIndex]?.focus();
    },
    [onChange],
  );

  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="6 位验证码输入">
      {code.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          aria-label={`验证码第 ${i + 1} 位`}
          className="h-12 w-11 rounded-lg border border-slate-200 bg-slate-50/60 text-center text-lg font-semibold text-slate-900 shadow-sm transition-all focus:border-[#2563eb] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      ))}
    </div>
  );
}

/* ── 主组件 ── */
export function ForgotPasswordWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<ForgotPasswordState>(INITIAL_STATE);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* 倒计时 */
  useEffect(() => {
    if (state.countdown > 0) {
      countdownRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.countdown <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return { ...prev, countdown: 0 };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [state.countdown]);

  /* ── Step 1: 发送验证码 ── */
  async function handleSendCode() {
    const trimmed = state.email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setState((prev) => ({
        ...prev,
        message: AUTH_VALIDATION.emailInvalid,
        messageTone: "error",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSending: true,
      message: "",
      messageTone: "idle",
    }));

    try {
      const result = await requestPasswordResetWithConsole({ email: trimmed });
      setDebugCode(result.debugCode ?? null);
      setState((prev) => ({
        ...prev,
        isSending: false,
        countdown: 60,
        step: 2,
        message: result.deliveryMode === "email"
          ? "验证码已发送，10 分钟内有效。"
          : result.debugCode
            ? "当前环境未接入真实邮件，请使用下方验证码。"
            : "",
        messageTone: result.debugCode || result.deliveryMode === "email" ? "success" : "idle",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSending: false,
        message: localizeAuthError(error, "发送验证码失败，请稍后重试。"),
        messageTone: "error",
      }));
    }
  }

  /* ── Step 2: 重置密码 ── */
  async function handleResetPassword() {
    const codeStr = state.code.join("");
    if (codeStr.length !== 6) {
      setState((prev) => ({
        ...prev,
        message: AUTH_VALIDATION.codeIncomplete,
        messageTone: "error",
      }));
      return;
    }
    if (!state.newPassword || state.newPassword.length < 6) {
      setState((prev) => ({
        ...prev,
        message: AUTH_VALIDATION.passwordMinReset,
        messageTone: "error",
      }));
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      setState((prev) => ({
        ...prev,
        message: AUTH_VALIDATION.passwordMismatch,
        messageTone: "error",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isResetting: true,
      message: "",
      messageTone: "idle",
    }));

    try {
      await confirmPasswordResetWithConsole({
        email: state.email.trim(),
        code: codeStr,
        newPassword: state.newPassword,
      });
      setState((prev) => ({
        ...prev,
        isResetting: false,
        step: 3,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isResetting: false,
        message: localizeAuthError(error, "重置密码失败，请稍后重试。"),
        messageTone: "error",
      }));
    }
  }

  /* ── 密码强度 ── */
  const strength = getPasswordStrength(state.newPassword);
  const strengthLabel = STRENGTH_LABELS[strength];
  const strengthColor = STRENGTH_COLORS[strength];
  const barWidth = STRENGTH_BAR_WIDTH[strength];

  const canGoBack = state.step === 2;
  const isBusy = state.isSending || state.isResetting;

  /* ── 返回 Step 1 ── */
  function handleGoBack() {
    setState((prev) => ({
      ...prev,
      step: 1,
      code: ["", "", "", "", "", ""],
      newPassword: "",
      confirmPassword: "",
      message: "",
      messageTone: "idle",
    }));
  }

  return (
    <div className="flex min-h-dvh w-full bg-gradient-to-br from-slate-50 to-blue-50/30">
      <main className="flex flex-1 flex-col">
        {/* 顶部 */}
        <div className="flex items-center justify-between px-8 py-6 text-sm text-slate-500 sm:px-12">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-[#2563eb]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回登录</span>
          </Link>
          <span className="text-xs text-slate-400">{BRAND_NAME} 安全认证</span>
        </div>

        {/* 居中卡片 */}
        <div className="flex flex-1 items-start justify-center px-6 pt-16">
          <div className="w-full max-w-[420px]">
            {/* 卡片 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(30,58,138,0.25)]">
              {/* 步骤指示器 */}
              <StepIndicator step={state.step} />

              {/* ── Step 3: 成功态 ── */}
              {state.step === 3 && (
                <div className="flex flex-col items-center py-6">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">密码重置成功</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    请使用新密码重新登录您的账号
                  </p>
                  <Button
                    size="lg"
                    className="mt-8 h-11 w-full bg-[#2563eb] text-base hover:bg-[#1d4ed8]"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => router.push("/login")}
                  >
                    返回登录
                  </Button>
                </div>
              )}

              {/* ── Step 1: 输入邮箱 ── */}
              {state.step === 1 && (
                <div>
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10">
                      <Mail className="h-6 w-6 text-[#2563eb]" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">找回密码</h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                      请输入注册时使用的邮箱，我们将发送验证码
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-sm font-medium text-slate-700">
                        邮箱地址
                      </Label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition-all focus-within:border-[#2563eb] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563eb]/20">
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                          id="reset-email"
                          type="email"
                          value={state.email}
                          disabled={isBusy}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              email: e.target.value,
                              message: "",
                              messageTone: "idle",
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendCode();
                          }}
                          placeholder="请输入工作邮箱"
                          className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      size="lg"
                      loading={state.isSending}
                      disabled={isBusy}
                      className="h-11 w-full bg-[#2563eb] text-base hover:bg-[#1d4ed8]"
                      onClick={handleSendCode}
                    >
                      {state.isSending ? "发送中..." : "发送验证码"}
                    </Button>

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

                    <p className="text-center text-xs text-slate-400">
                      验证码 10 分钟内有效，请确保邮箱可正常收信
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 2: 验证码 + 新密码 ── */}
              {state.step === 2 && (
                <div>
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10">
                      <Key className="h-6 w-6 text-[#2563eb]" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">验证身份</h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                      验证码已发送至 <span className="font-medium text-slate-700">{state.email}</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* 验证码 */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">验证码</Label>
                      <CodeInputs
                        code={state.code}
                        disabled={isBusy}
                        onChange={(index, value) =>
                          setState((prev) => {
                            const next = [...prev.code];
                            next[index] = value;
                            return { ...prev, code: next, message: "", messageTone: "idle" };
                          })
                        }
                      />
                      <p className="text-center text-xs text-slate-400">
                        {state.countdown > 0
                          ? `${state.countdown} 秒后可重新发送`
                          : "未收到？点击下方按钮重新发送"}
                      </p>
                    </div>

                    {/* 重新发送 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={state.countdown > 0 || isBusy}
                      className="mx-auto flex h-8 text-xs text-[#2563eb] hover:text-[#1d4ed8]"
                      onClick={() => void handleSendCode()}
                    >
                      {state.countdown > 0 ? `${state.countdown}s 后重发` : "重新发送验证码"}
                    </Button>

                    {/* 分割线 */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100" />
                      </div>
                    </div>

                    {/* 新密码 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                        新密码
                      </Label>
                      <input
                        id="new-password"
                        type="password"
                        value={state.newPassword}
                        disabled={isBusy}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                            message: "",
                            messageTone: "idle",
                          }))
                        }
                        placeholder="请输入新密码（至少 6 位）"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/20"
                        autoComplete="new-password"
                      />

                      {/* 密码强度条 */}
                      {state.newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barWidth} ${strengthColor}`}
                            />
                          </div>
                          <p className={`text-xs ${strength === "strong" || strength === "good" ? "text-green-600" : strength === "fair" ? "text-orange-500" : "text-red-500"}`}>
                            密码强度：{strengthLabel}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 确认密码 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                        确认密码
                      </Label>
                      <input
                        id="confirm-password"
                        type="password"
                        value={state.confirmPassword}
                        disabled={isBusy}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                            message: "",
                            messageTone: "idle",
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleResetPassword();
                        }}
                        placeholder="请再次输入新密码"
                        className={`h-11 w-full rounded-lg border bg-slate-50/60 px-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#2563eb]/20 ${
                          state.confirmPassword && state.confirmPassword !== state.newPassword
                            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                            : state.confirmPassword && state.confirmPassword === state.newPassword
                              ? "border-green-300 focus:border-green-400 focus:ring-green-200"
                              : "border-slate-200 focus:border-[#2563eb]"
                        }`}
                        autoComplete="new-password"
                      />
                      {state.confirmPassword && state.confirmPassword !== state.newPassword && (
                        <p className="text-xs text-red-500">两次输入的密码不一致</p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        variant="outline"
                        size="lg"
                        disabled={isBusy}
                        className="h-11 shrink-0 px-4"
                        onClick={handleGoBack}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        上一步
                      </Button>
                      <Button
                        size="lg"
                        loading={state.isResetting}
                        disabled={isBusy}
                        className="h-11 flex-1 bg-[#2563eb] text-base hover:bg-[#1d4ed8]"
                        onClick={handleResetPassword}
                      >
                        {state.isResetting ? "重置中..." : "重置密码"}
                      </Button>
                    </div>

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

                    {debugCode ? (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
                        测试环境验证码：<strong className="font-mono">{debugCode}</strong>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <nav className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <Link href="/login/code" className="hover:text-[#2563eb]">
                验证码登录
              </Link>
              <Link href="/register" className="hover:text-[#2563eb]">
                注册说明
              </Link>
              <Link href="/legal/user-agreement" className="hover:text-[#2563eb]">
                用户协议
              </Link>
              <Link href="/legal/privacy-policy" className="hover:text-[#2563eb]">
                隐私政策
              </Link>
            </nav>

            {/* 页脚 */}
            <p className="mt-6 text-center text-xs text-slate-400">
              © 2026 {BRAND_NAME} 版权所有 <span className="mx-2 text-slate-300">|</span> 浙ICP备12345678号
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
