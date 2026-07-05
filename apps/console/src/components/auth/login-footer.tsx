import Link from "next/link";

import styles from "@/styles/login.module.css";

export function LoginFooter() {
  return (
    <footer className={styles.footer}>
      <nav>
        <Link href="/login">登录</Link>
        <Link href="/trial">申请试用</Link>
        <Link href="/reset-password">重置密码</Link>
        <Link href="/legal/user-agreement">用户协议</Link>
        <Link href="/legal/privacy-policy">隐私政策</Link>
      </nav>
      <p>© 2026 企云 AI 企业智能服务平台</p>
    </footer>
  );
}
