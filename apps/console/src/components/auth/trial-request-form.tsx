"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthFormFeedback } from "@/components/auth/auth-form-feedback";
import styles from "@/styles/login.module.css";

type TrialStatus = "idle" | "loading" | "success" | "error";

export function TrialRequestForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [requirement, setRequirement] = useState("");
  const [status, setStatus] = useState<TrialStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!companyName.trim() || !contactName.trim() || !email.trim()) {
      setStatus("error");
      setMessage("请填写企业名称、联系人姓名和工作邮箱。");
      return;
    }

    if (!email.includes("@")) {
      setStatus("error");
      setMessage("请输入有效的工作邮箱。");
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
      setMessage(error instanceof Error ? error.message : "试用申请提交失败，请稍后重试。");
    }
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

        <label className={styles.field}>
          <span className={styles.srOnly}>企业名称</span>
          <input
            type="text"
            placeholder="请输入企业名称"
            value={companyName}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.srOnly}>联系人</span>
          <input
            type="text"
            placeholder="联系人姓名"
            value={contactName}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => setContactName(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.srOnly}>工作邮箱</span>
          <input
            type="email"
            placeholder="工作邮箱（用于接收邀请）"
            value={email}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.srOnly}>联系电话</span>
          <input
            type="tel"
            placeholder="联系电话（选填）"
            value={phone}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.srOnly}>官网地址</span>
          <input
            type="url"
            placeholder="企业官网（选填）"
            value={website}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.srOnly}>需求描述</span>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="简要描述产品类型、官网接入或询盘场景（选填）"
            value={requirement}
            disabled={status === "loading" || status === "success"}
            onChange={(event) => setRequirement(event.target.value)}
          />
        </label>

        <button className={styles.submit} type="submit" disabled={status === "loading" || status === "success"}>
          {status === "loading" ? "提交中..." : "提交试用申请"}
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
          message={status === "loading" ? "正在提交试用申请..." : message}
        />

        <div className={`${styles.authPageActions} ${styles.authLinks}`}>
          <Link href="/login">返回登录</Link>
          <Link href="/login/code">验证码登录</Link>
        </div>

        <div className={styles.helperCard}>
          <strong>已有邀请链接？</strong>
          请直接打开管理员发送的邀请链接设置密码，或返回 <Link href="/login">登录页</Link>。
        </div>
      </form>
    </section>
  );
}
