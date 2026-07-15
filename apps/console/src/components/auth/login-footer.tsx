import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import styles from "@/styles/login.module.css";

export function LoginFooter() {
  return (
    <footer className={styles.footer}>
      <nav>
        <Link href="/login">登录</Link>
        <Link href="/register">注册说明</Link>
        <Link href="/trial">申请试用</Link>
        <Link href="/forgot-password">忘记密码</Link>
        <Link href="/legal/user-agreement">用户协议</Link>
        <Link href="/legal/privacy-policy">隐私政策</Link>
      </nav>
      <p>© 2026 {BRAND_NAME} · 工业官网智能获客平台</p>
    </footer>
  );
}
