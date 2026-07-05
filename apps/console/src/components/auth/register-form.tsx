"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AuthFieldError, AuthFormFeedback } from "@/components/auth/auth-form-feedback";
import { registerWithConsole } from "@/lib/auth/client";
import styles from "@/styles/login.module.css";

type RegisterStatus = "idle" | "loading" | "error" | "success";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: "请输入姓名。" });
      setStatus("error");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setFieldErrors({ email: "请输入有效邮箱地址。" });
      setStatus("error");
      return;
    }

    if (password.length < 6) {
      setFieldErrors({ password: "密码至少需要 6 位。" });
      setStatus("error");
      return;
    }

    if (!acceptedTerms) {
      setFieldErrors({ terms: "请先同意用户协议与隐私政策。" });
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      await registerWithConsole({
        name: name.trim(),
        email: email.trim(),
        password,
        workspaceName: workspaceName.trim() || `${name.trim()} 的工作区`,
      });
      setStatus("success");
      setMessage("注册成功，正在进入控制台。");
      router.push("/dashboard");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "注册失败，请稍后重试。");
    }
  }

  const isSubmitting = status === "loading" || status === "success";

  return (
    <section className={styles.formPanel} aria-label="注册区域">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>邮箱创建账号</span>
          <h2>注册账号</h2>
          <p>使用企业邮箱创建账号，系统会自动生成默认工作区。</p>
        </header>

        <label className={`${styles.field} ${fieldErrors.name ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>姓名</span>
          <input
            type="text"
            placeholder="请输入姓名"
            value={name}
            disabled={isSubmitting}
            onChange={(event) => {
              setName(event.target.value);
              setFieldErrors((current) => ({ ...current, name: undefined }));
            }}
          />
          <AuthFieldError message={fieldErrors.name} />
        </label>

        <label className={`${styles.field} ${fieldErrors.email ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>邮箱</span>
          <input
            type="email"
            placeholder="请输入工作邮箱"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
          />
          <AuthFieldError message={fieldErrors.email} />
        </label>

        <label className={`${styles.field} ${fieldErrors.password ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>密码</span>
          <input
            type="password"
            placeholder="请输入登录密码"
            value={password}
            disabled={isSubmitting}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
          />
          <AuthFieldError message={fieldErrors.password} />
        </label>

        <label className={styles.field}>
          <span className={styles.srOnly}>工作区名称</span>
          <input
            type="text"
            placeholder="工作区名称（可选）"
            value={workspaceName}
            disabled={isSubmitting}
            onChange={(event) => setWorkspaceName(event.target.value)}
          />
        </label>

        <label className={styles.agreement}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked);
              setFieldErrors((current) => ({ ...current, terms: undefined }));
            }}
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
        <AuthFieldError message={fieldErrors.terms} />

        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {status === "loading" ? (
            <span className={styles.spinner} aria-hidden />
          ) : status === "success" ? (
            "注册成功"
          ) : (
            "注册并进入控制台"
          )}
        </button>

        <AuthFormFeedback
          tone={
            status === "loading"
              ? "loading"
              : status === "success"
                ? "success"
                : status === "error"
                  ? "error"
                  : "idle"
          }
          message={message}
        />

        <div className={`${styles.authPageActions} ${styles.authLinks}`}>
          <Link href="/login">返回登录</Link>
          <Link href="/login/code">验证码登录</Link>
        </div>

        <div className={styles.helperCard}>
          <strong>注册说明</strong>
          当前版本仅支持邮箱注册。注册完成后，你可以继续用密码登录，也可以改用邮箱验证码登录。
        </div>
      </form>
    </section>
  );
}
