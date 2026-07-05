import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { ResetPasswordPanel } from "@/components/auth/reset-password-panel";
import styles from "@/styles/login.module.css";

export default function ResetPasswordPage() {
  return (
    <section className={styles.shell} aria-label="重置密码">
      <LoginBrandPanel />
      <ResetPasswordPanel />
      <LoginFooter />
    </section>
  );
}
