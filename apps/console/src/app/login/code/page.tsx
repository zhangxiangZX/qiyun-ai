import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { CodeLoginPanel } from "@/components/auth/code-login-panel";
import styles from "@/styles/login.module.css";

export default function CodeLoginPage() {
  return (
    <section className={styles.shell} aria-label="企云 AI 验证码登录">
      <LoginBrandPanel />
      <CodeLoginPanel />
      <LoginFooter />
    </section>
  );
}
