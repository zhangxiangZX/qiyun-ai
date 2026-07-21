"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AuthFieldError, AuthFormFeedback } from "@/components/auth/auth-form-feedback";
import { loginWithConsole } from "@/lib/auth/client";
import { localizeAuthError, AUTH_VALIDATION } from "@/lib/auth/messages";
import { resolveWorkspaceHomePathFromSession } from "@/lib/auth/workspace-home";
import { loginIcons } from "@/lib/auth/login-icons";
import styles from "@/styles/login.module.css";

type LoginStatus = "idle" | "loading" | "error" | "success";

const REMEMBER_EMAIL_KEY = "qiyun-console-remember-email";

const actionItems = [
  { label: "验证码登录", icon: loginIcons.codeLogin, href: "/login/code" },
  { label: "注册开通", icon: loginIcons.register, href: "/register" },
  { label: "申请试用", icon: loginIcons.register, href: "/trial" },
];

const ssoItems = [
  { label: "企业微信登录", icon: loginIcons.wechat },
  { label: "钉钉登录", icon: loginIcons.dingtalk },
  { label: "飞书登录", icon: loginIcons.feishu },
  { label: "企业 SSO 登录", icon: loginIcons.sso },
];

export function LoginForm({
  inviteEmail,
  inviteToken,
}: {
  inviteEmail?: string;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    account?: string;
    password?: string;
    terms?: string;
  }>({});
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState<"ok" | "bad" | "hint" | "">("");

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail);
    }
  }, [inviteEmail]);

  function validateForm() {
    const nextErrors: { account?: string; password?: string; terms?: string } = {};

    if (!email.trim()) {
      nextErrors.account = AUTH_VALIDATION.emailRequired;
    } else if (!email.includes("@")) {
      nextErrors.account = AUTH_VALIDATION.emailInvalid;
    }

    if (!password.trim()) {
      nextErrors.password = AUTH_VALIDATION.passwordRequired;
    } else if (password.length < 6) {
      nextErrors.password = AUTH_VALIDATION.passwordMinLogin;
    }

    if (!acceptedTerms) {
      nextErrors.terms = AUTH_VALIDATION.termsRequired;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormMessage("");
    setFormMessageType("");

    if (!validateForm()) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const session = await loginWithConsole({
        email: email.trim(),
        password,
      });

      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      setStatus("success");
      setFormMessage("登录成功，正在进入控制台。");
      setFormMessageType("ok");

      const destination = inviteToken
        ? `/accept-invite?token=${encodeURIComponent(inviteToken)}`
        : session.user.mustChangePassword
          ? `/reset-password?email=${encodeURIComponent(session.user.email)}`
          : session.user.platformRole === "platform_admin"
            ? "/dashboard/super-admin"
            : resolveWorkspaceHomePathFromSession(session);

      // The login response already contains the complete session. Avoid a second
      // upstream round trip here so slow workspace queries cannot block navigation.
      window.setTimeout(() => router.replace(destination), 300);
    } catch (error) {
      setStatus("error");
      setFormMessage(
        localizeAuthError(error, "登录失败，请稍后重试。"),
      );
      setFormMessageType("bad");
    }
  }

  return (
    <section className={styles.formPanel} aria-label="登录区域">
      <form className={styles.form} id="loginForm" method="post" onSubmit={handleSubmit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>邮箱密码登录</span>
          <h2>欢迎登录</h2>
          <p>使用企业邮箱和密码进入控制台。</p>
        </header>

        <label className={`${styles.field} ${fieldErrors.account ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>邮箱</span>
          <img className={styles.inputIcon} src={loginIcons.user} alt="" />
          <input
            id="account"
            name="account"
            type="email"
            autoComplete="username"
            placeholder="请输入工作邮箱"
            value={email}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, account: undefined }));
              setStatus("idle");
            }}
          />
          <AuthFieldError message={fieldErrors.account} />
        </label>

        <label className={`${styles.field} ${fieldErrors.password ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>密码</span>
          <img className={styles.inputIcon} src={loginIcons.lock} alt="" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="请输入登录密码"
            value={password}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
              setStatus("idle");
            }}
          />
          <button
            type="button"
            className={styles.eyeButton}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            onClick={() => setShowPassword((current) => !current)}
          >
            <img src={showPassword ? loginIcons.eyeOff : loginIcons.eye} alt="" />
          </button>
          <AuthFieldError message={fieldErrors.password} />
        </label>

        <div className={styles.assist}>
          <label className={styles.remember}>
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>记住邮箱</span>
          </label>
          <a href="/forgot-password" className={styles.authLinkButton} title="通过邮箱验证码重置密码">
            忘记密码？重置密码
          </a>
        </div>

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

        <button className={styles.submit} type="submit" disabled={status === "loading" || status === "success"}>
          {status === "loading" ? (
            <span className={styles.spinner} aria-hidden />
          ) : status === "success" ? (
            "登录成功"
          ) : (
            "登录"
          )}
        </button>

        <AuthFormFeedback
          tone={
            status === "loading"
              ? "loading"
              : formMessageType === "ok"
                ? "success"
                : formMessageType === "hint"
                  ? "hint"
                  : formMessageType === "bad"
                    ? "error"
                    : "idle"
          }
          message={formMessage}
        />

        <div className={styles.divider}>
          <span>其他登录方式</span>
        </div>

        <div className={styles.actionGrid}>
          {actionItems.map((item) => (
            <Link key={item.label} href={item.href} className={styles.actionLink}>
              <img src={item.icon} alt="" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.ssoGroup}>
          <div className={styles.ssoDivider}>
            <span>企业账号快捷登录</span>
          </div>
          <div>
            {ssoItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={styles.comingSoonButton}
                aria-disabled="true"
                title={`${item.label} 暂未开放`}
                aria-label={item.label}
              >
                <img src={item.icon} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.helperCard}>
          <strong>登录说明</strong>
          当前版本支持邮箱密码登录、邮箱验证码登录和邮箱重置密码。新企业请通过「申请试用」联系管理员开通；已有邀请链接的成员请直接激活账号。
        </div>
      </form>
    </section>
  );
}
