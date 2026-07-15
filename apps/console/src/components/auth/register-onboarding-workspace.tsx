"use client";

import Link from "next/link";

import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { BRAND_NAME } from "@/lib/brand";
import styles from "@/styles/login.module.css";

const OPTIONS = [
  {
    title: "邮箱验证码登录（推荐）",
    description: "输入工作邮箱获取验证码，首次使用将自动创建账号并进入控制台。无需单独填写手机号。",
    href: "/login/code",
    cta: "前往验证码登录",
  },
  {
    title: "受邀成员注册",
    description: "管理员已发送邀请邮件时，请打开邮件中的链接完成注册并加入工作区。",
    href: "/login",
    cta: "使用邀请邮箱登录",
  },
  {
    title: "企业试用申请",
    description: "新企业需由平台管理员审核后开通工作区，提交申请后 1–2 个工作日内邮件联系。",
    href: "/trial",
    cta: "提交试用申请",
  },
] as const;

export function RegisterOnboardingWorkspace() {
  return (
    <section className={styles.shell} aria-label={`${BRAND_NAME} 注册说明`}>
      <LoginBrandPanel />
      <section className={styles.formPanel} aria-label="注册方式">
        <div className={styles.form}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>开通账号</span>
            <h2>注册与开通</h2>
            <p>
              V1 不提供无审核的公开密码注册。请根据您的场景选择下方入口，避免填写后无法提交。
            </p>
          </header>

          <div className="space-y-3">
            {OPTIONS.map((option) => (
              <article
                key={option.title}
                className="rounded-control border border-border bg-card p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-foreground">{option.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                <Link href={option.href} className={`${styles.authLink} mt-3 inline-block text-sm font-medium`}>
                  {option.cta} →
                </Link>
              </article>
            ))}
          </div>

          <div className={`${styles.authPageActions} ${styles.authLinks}`}>
            <Link href="/login">返回密码登录</Link>
            <Link href="/legal/user-agreement">用户协议</Link>
            <Link href="/legal/privacy-policy">隐私政策</Link>
          </div>

          <div className={styles.helperCard}>
            <strong>字段说明</strong>
            验证码登录仅使用工作邮箱与 6 位邮箱验证码，不涉及手机号；试用申请中的联系电话为选填。
          </div>
        </div>
      </section>
      <LoginFooter />
    </section>
  );
}
