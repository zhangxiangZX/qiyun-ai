"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthFieldError, AuthFormFeedback } from "@/components/auth/auth-form-feedback";
import { defaultWorkspacePlan, workspacePlanLabel, workspacePlanOptions } from "@/lib/platform/plans";
import { AUTH_VALIDATION, localizeAuthError } from "@/lib/auth/messages";
import styles from "@/styles/login.module.css";

type TrialStatus = "idle" | "loading" | "success" | "error";

const nextSteps = [
  {
    step: "1",
    title: "平台审核",
    desc: "管理员会在 1–2 个工作日内查看您的企业与需求信息。",
  },
  {
    step: "2",
    title: "邮件邀请",
    desc: "审核通过后，开通邀请将发送至您填写的工作邮箱。",
  },
  {
    step: "3",
    title: "登录配置",
    desc: "点击邮件链接设置密码，即可进入控制台配置知识库与 Widget。",
  },
] as const;

export function TrialRequestForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [requestedPlan, setRequestedPlan] = useState(defaultWorkspacePlan);
  const [requirement, setRequirement] = useState("");
  const [status, setStatus] = useState<TrialStatus>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    companyName?: string;
    contactName?: string;
    email?: string;
  }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});

    const nextErrors: typeof fieldErrors = {};
    if (!companyName.trim()) nextErrors.companyName = "请填写企业名称。";
    if (!contactName.trim()) nextErrors.contactName = "请填写联系人姓名。";
    if (!email.trim()) {
      nextErrors.email = AUTH_VALIDATION.emailRequired;
    } else if (!email.includes("@")) {
      nextErrors.email = AUTH_VALIDATION.emailInvalid;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setStatus("error");
      setMessage("请完善必填项后再提交。");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/trial-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          website: website.trim(),
          requestedPlan,
          requirement: requirement.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "试用申请提交失败，请稍后重试。");
      }

      setStatus("success");
      setMessage("申请已提交。平台管理员会在 1-2 个工作日内审核，并通过邮箱联系您开通试用。");
    } catch (error) {
      setStatus("error");
      setMessage(localizeAuthError(error, "试用申请提交失败，请稍后重试。"));
    }
  }

  if (status === "success") {
    return (
      <section className={styles.formPanel} aria-label="试用申请已提交">
        <div className={`${styles.form} ${styles.formCompact} ${styles.trialSuccessForm}`}>
          <div className={styles.trialSuccessHero}>
            <div className={styles.trialSuccessIcon} aria-hidden>
              ✓
            </div>
            <header className={styles.header}>
              <span className={styles.eyebrow}>提交成功</span>
              <h2>试用申请已收到</h2>
              <p>
                我们已记录您的申请，平台管理员审核后会通过邮箱发送工作区开通邀请，请留意收件箱与垃圾邮件文件夹。
              </p>
            </header>
          </div>

          <div className={styles.trialSuccessSla} role="status">
            <span className={styles.trialSuccessSlaLabel}>预计审核时效</span>
            <p className={styles.trialSuccessSlaValue}>
              <strong>1–2</strong>
              <span>个工作日</span>
            </p>
            <p className={styles.trialSuccessSlaDesc}>
              平台管理员将查看您的企业与需求信息，审核结果会发送至 <em>{email.trim()}</em>
            </p>
          </div>

          <dl className={styles.trialSuccessSummary}>
            <div className={styles.trialSuccessSummaryRow}>
              <dt>企业名称</dt>
              <dd>{companyName.trim()}</dd>
            </div>
            <div className={styles.trialSuccessSummaryRow}>
              <dt>联系人</dt>
              <dd>{contactName.trim()}</dd>
            </div>
            <div className={styles.trialSuccessSummaryRow}>
              <dt>工作邮箱</dt>
              <dd>{email.trim()}</dd>
            </div>
            <div className={styles.trialSuccessSummaryRow}>
              <dt>意向套餐</dt>
              <dd>{workspacePlanLabel(requestedPlan)}</dd>
            </div>
          </dl>

          <section className={styles.trialSuccessSteps} aria-label="后续流程">
            <h3>接下来会发生什么</h3>
            <ol>
              {nextSteps.map((item, index) => (
                <li
                  key={item.step}
                  className={
                    index === 0
                      ? `${styles.trialSuccessStep} ${styles.trialSuccessStepActive}`
                      : styles.trialSuccessStep
                  }
                >
                  <span className={styles.trialSuccessStepBadge}>{item.step}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.trialSuccessActions}>
            <Link href="/" className={styles.homePrimaryCta}>
              返回首页
            </Link>
            <Link href="/login" className={styles.homeSecondaryCta}>
              已有账号，去登录
            </Link>
          </div>

          <div className={styles.helperCard}>
            <strong>已有邀请链接？</strong>
            若管理员已发送邀请，请直接打开邮件中的链接完成激活，无需等待本次审核。
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.formPanel} aria-label="申请试用">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <header className={styles.header}>
          <span className={styles.eyebrow}>企业试用</span>
          <h2>申请试用 AI云</h2>
          <p>
            第一版由平台管理员统一开通工作区。提交申请后，我们会通过邮箱联系您完成审核与邀请激活。
          </p>
        </header>

        <label className={`${styles.field} ${styles.plainField} ${fieldErrors.companyName ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>企业名称</span>
          <input
            type="text"
            placeholder="请输入企业名称"
            value={companyName}
            disabled={status === "loading"}
            onChange={(event) => {
              setCompanyName(event.target.value);
              setFieldErrors((current) => ({ ...current, companyName: undefined }));
            }}
          />
          <AuthFieldError message={fieldErrors.companyName} />
        </label>

        <label className={`${styles.field} ${styles.plainField} ${fieldErrors.contactName ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>联系人</span>
          <input
            type="text"
            placeholder="联系人姓名"
            value={contactName}
            disabled={status === "loading"}
            onChange={(event) => {
              setContactName(event.target.value);
              setFieldErrors((current) => ({ ...current, contactName: undefined }));
            }}
          />
          <AuthFieldError message={fieldErrors.contactName} />
        </label>

        <label className={`${styles.field} ${styles.plainField} ${fieldErrors.email ? styles.invalid : ""}`}>
          <span className={styles.srOnly}>工作邮箱</span>
          <input
            type="email"
            placeholder="工作邮箱（用于接收邀请）"
            value={email}
            disabled={status === "loading"}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
          />
          <AuthFieldError message={fieldErrors.email} />
        </label>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>联系电话</span>
          <input
            type="tel"
            placeholder="联系电话（选填）"
            value={phone}
            disabled={status === "loading"}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>官网地址</span>
          <input
            type="url"
            placeholder="企业官网（选填）"
            value={website}
            disabled={status === "loading"}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>意向套餐</span>
          <select
            value={requestedPlan}
            disabled={status === "loading"}
            onChange={(event) => setRequestedPlan(event.target.value)}
            aria-label="意向套餐"
          >
            {workspacePlanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={`${styles.field} ${styles.plainField}`}>
          <span className={styles.srOnly}>需求描述</span>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="简要描述产品类型、官网接入或询盘场景（选填）"
            value={requirement}
            disabled={status === "loading"}
            onChange={(event) => setRequirement(event.target.value)}
          />
        </label>

        <button className={styles.submit} type="submit" disabled={status === "loading"}>
          {status === "loading" ? "提交中..." : "提交试用申请"}
        </button>

        <AuthFormFeedback
          tone={
            status === "loading"
              ? "loading"
              : status === "error"
                ? "error"
                : "idle"
          }
          message={status === "loading" ? "正在提交试用申请..." : message}
        />

        <div className={`${styles.authPageActions} ${styles.authLinks}`}>
          <Link href="/login">返回登录</Link>
          <Link href="/login/code">验证码登录</Link>
          <Link href="/register">注册说明</Link>
        </div>

        <div className={styles.helperCard}>
          <strong>已有邀请链接？</strong>
          请直接打开管理员发送的邀请链接设置密码，或返回 <Link href="/login">登录页</Link>。
        </div>
      </form>
    </section>
  );
}
