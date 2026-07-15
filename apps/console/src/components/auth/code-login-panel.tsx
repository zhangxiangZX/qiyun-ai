"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthFormFeedback } from "@/components/auth/auth-form-feedback";
import {
  requestLoginCodeWithConsole,
  verifyLoginCodeWithConsole,
  type LoginCodeRequestResult,
} from "@/lib/auth/client";
import { AUTH_VALIDATION, localizeAuthError } from "@/lib/auth/messages";
import styles from "@/styles/login.module.css";

type CodeLoginStatus = "idle" | "sending" | "ready" | "verifying" | "error" | "success";

export function CodeLoginPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<CodeLoginStatus>("idle");
  const [message, setMessage] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"simulated" | "email" | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function handleRequestCode() {
    setMessage("");
    setDebugCode(null);

    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage(AUTH_VALIDATION.emailInvalid);
      return;
    }

    setStatus("sending");

    try {
      const result: LoginCodeRequestResult = await requestLoginCodeWithConsole({
        email: email.trim(),
      });
      setStatus("ready");
      setExpiresAt(result.expiresAt);
      setDeliveryMode(result.deliveryMode ?? null);
      setDebugCode(result.debugCode ?? null);
      setMessage(
        result.deliveryMode === "email"
          ? "验证码已发送，10 分钟内有效。"
          : result.debugCode
            ? "当前环境未接入真实邮件，请使用下方验证码登录。"
            : "验证码已生成。若未显示，请联系管理员开启 AUTH_SHOW_DEBUG_CODES。",
      );
    } catch (error) {
      setStatus("error");
      setMessage(localizeAuthError(error, "验证码发送失败，请稍后重试。"));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage(AUTH_VALIDATION.emailInvalid);
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setStatus("error");
      setMessage(AUTH_VALIDATION.codeRequired);
      return;
    }

    if (!acceptedTerms) {
      setStatus("error");
      setMessage(AUTH_VALIDATION.termsRequired);
      return;
    }

    setStatus("verifying");

    try {
      await verifyLoginCodeWithConsole({
        email: email.trim(),
        code: code.trim(),
      });
      setStatus("success");
      setMessage("登录成功，正在进入控制台。");
      router.push("/dashboard");
    } catch (error) {
      setStatus("error");
      setMessage(localizeAuthError(error, "验证码校验失败，请稍后重试。"));
    }
  }

  return (
    <section className={styles.formPanel} aria-label="验证码登录区域">
      <form className={`${styles.form} ${styles.formCompact}`} onSubmit={handleSubmit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>邮箱验证码登录</span>
          <h2>验证码登录</h2>
          <p>忘记密码时也可以先用邮箱验证码进入控制台。</p>
        </header>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>邮箱</span>
          <input
            type="email"
            placeholder="请输入工作邮箱"
            value={email}
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
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setStatus("idle");
              }}
            />
          </label>
          <button
            className={styles.secondaryButton}
            type="button"
            disabled={status === "sending" || status === "verifying"}
            onClick={handleRequestCode}
          >
            {status === "sending" ? "发送中..." : "获取验证码"}
          </button>
        </div>

        <label className={styles.agreement}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
          />
          <span>
            我已阅读并同意{" "}
            <Link href="/legal/user-agreement" className={styles.authLink}>
              《用户协议》
            </Link>{" "}
            与{" "}
            <Link href="/legal/privacy-policy" className={styles.authLink}>
              《隐私政策》
            </Link>
          </span>
        </label>

        <button className={styles.submit} type="submit" disabled={status === "verifying"}>
          {status === "verifying" ? <span className={styles.spinner} aria-hidden /> : "登录 / 注册并进入控制台"}
        </button>

        <AuthFormFeedback
          tone={
            status === "sending" || status === "verifying"
              ? "loading"
              : status === "success" || status === "ready"
                ? "success"
                : status === "error"
                  ? "error"
                  : "idle"
          }
          message={
            status === "sending"
              ? "正在发送验证码…"
              : status === "verifying"
                ? "正在验证并登录…"
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
            当前服务器使用模拟邮件模式。请在 API 环境变量中设置 AUTH_SHOW_DEBUG_CODES=true 后重新获取验证码，或配置 Resend 真实发信。
          </div>
        ) : null}

        <div className={styles.helperCard}>
          <strong>使用说明</strong>
          首次验证码登录会自动创建账号。验证码 10 分钟内有效。
        </div>

        <div className={`${styles.authPageActions} ${styles.authLinks}`}>
          <Link href="/login">返回密码登录</Link>
          <Link href="/register">注册说明</Link>
          <Link href="/forgot-password">忘记密码</Link>
          <Link href="/trial">申请试用</Link>
        </div>
      </form>
    </section>
  );
}
