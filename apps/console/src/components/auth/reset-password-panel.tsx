"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthFormFeedback } from "@/components/auth/auth-form-feedback";
import {
  confirmPasswordResetWithConsole,
  requestPasswordResetWithConsole,
  type LoginCodeRequestResult,
} from "@/lib/auth/client";
import { getRateLimitMessage, isRateLimited } from "@/lib/api/errors";
import styles from "@/styles/login.module.css";

type ResetStatus = "idle" | "sending" | "ready" | "saving" | "error" | "success";

export function ResetPasswordPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<ResetStatus>("idle");
  const [message, setMessage] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"simulated" | "email" | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function handleRequestCode() {
    setMessage("");
    setDebugCode(null);

    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("请输入有效邮箱地址。");
      return;
    }

    setStatus("sending");

    try {
      const result: LoginCodeRequestResult = await requestPasswordResetWithConsole({
        email: email.trim(),
      });
      setStatus("ready");
      setExpiresAt(result.expiresAt);
      setDeliveryMode(result.deliveryMode ?? null);
      setDebugCode(result.debugCode ?? null);
      setMessage(
        result.deliveryMode === "email"
          ? "重置验证码已发送，请查收邮箱并在 10 分钟内完成密码更新。"
          : result.debugCode
            ? "当前环境未接入真实邮件，请使用下方验证码完成重置。"
            : "验证码已生成。若未显示，请联系管理员开启 AUTH_SHOW_DEBUG_CODES。",
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        isRateLimited(error)
          ? getRateLimitMessage(error)
          : error instanceof Error
            ? error.message
            : "发送重置验证码失败。",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("请输入有效邮箱地址。");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setStatus("error");
      setMessage("请输入 6 位验证码。");
      return;
    }
    if (newPassword.trim().length < 6) {
      setStatus("error");
      setMessage("新密码至少需要 6 位。");
      return;
    }

    setStatus("saving");

    try {
      await confirmPasswordResetWithConsole({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setStatus("success");
      setMessage("密码已重置，正在返回登录页。");
      window.setTimeout(() => router.push("/login"), 900);
    } catch (error) {
      setStatus("error");
      setMessage(
        isRateLimited(error)
          ? getRateLimitMessage(error)
          : error instanceof Error
            ? error.message
            : "重置密码失败，请稍后重试。",
      );
    }
  }

  const isBusy = status === "sending" || status === "saving" || status === "success";

  return (
    <section className={styles.formPanel} aria-label="重置密码区域">
      <form className={`${styles.form} ${styles.formCompact}`} onSubmit={handleSubmit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>邮箱找回密码</span>
          <h2>重置密码</h2>
          <p>通过邮箱验证码设置新密码，完成后再用新密码登录。</p>
        </header>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>邮箱</span>
          <input
            type="email"
            placeholder="请输入工作邮箱"
            value={email}
            disabled={isBusy}
            onChange={(event) => {
              setEmail(event.target.value);
              setStatus("idle");
            }}
          />
        </label>

        <div className={styles.inlineActionRow}>
          <label className={`${styles.field} ${styles.plainField} ${styles.inlineActionField}`}>
            <span className={styles.srOnly}>验证码</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="请输入 6 位验证码"
              value={code}
              disabled={isBusy}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setStatus("idle");
              }}
            />
          </label>
          <button
            className={styles.secondaryButton}
            type="button"
            disabled={isBusy}
            onClick={handleRequestCode}
          >
            {status === "sending" ? "发送中..." : "获取验证码"}
          </button>
        </div>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>新密码</span>
          <input
            type="password"
            placeholder="请输入新密码"
            value={newPassword}
            disabled={isBusy}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <button className={styles.submit} type="submit" disabled={isBusy}>
          {status === "saving" ? (
            <span className={styles.spinner} aria-hidden />
          ) : status === "success" ? (
            "重置成功"
          ) : (
            "确认重置密码"
          )}
        </button>

        <AuthFormFeedback
          tone={
            status === "sending" || status === "saving"
              ? "loading"
              : status === "success" || status === "ready"
                ? "success"
                : status === "error"
                  ? "error"
                  : "idle"
          }
          message={
            status === "sending"
              ? "正在发送重置验证码…"
              : status === "saving"
                ? "正在更新密码…"
                : message
          }
        />

        {debugCode ? (
          <div className={styles.devCodeCard}>
            <strong>{deliveryMode === "simulated" ? "测试环境验证码" : "开发环境验证码"}</strong>
            <span>{debugCode}</span>
            {expiresAt ? <small>有效期至 {new Date(expiresAt).toLocaleString("zh-CN")}</small> : null}
          </div>
        ) : deliveryMode === "simulated" ? (
          <div className={styles.helperCard}>
            <strong>邮件未实际发送</strong>
            当前服务器使用模拟邮件模式。请在 API 环境变量中设置 <code>AUTH_SHOW_DEBUG_CODES=true</code> 后重新获取验证码，或配置 Resend 真实发信。
          </div>
        ) : null}

        <div className={styles.helperCard}>
          <strong>重置说明</strong>
          验证码 10 分钟内有效。若邮箱未注册账号，将无法发送重置验证码。
        </div>

        <div className={`${styles.authPageActions} ${styles.authLinks}`}>
          <Link href="/login">返回登录</Link>
          <Link href="/login/code">改用验证码登录</Link>
        </div>
      </form>
    </section>
  );
}
