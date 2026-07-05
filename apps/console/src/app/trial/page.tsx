import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { TrialRequestForm } from "@/components/auth/trial-request-form";
import styles from "@/styles/login.module.css";

export default function TrialPage() {
  return (
    <section className={styles.shell} aria-label="企云 AI 申请试用">
      <LoginBrandPanel />
      <TrialRequestForm />
      <LoginFooter />
    </section>
  );
}
