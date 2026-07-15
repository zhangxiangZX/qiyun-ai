import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { TrialRequestForm } from "@/components/auth/trial-request-form";
import { BRAND_NAME } from "@/lib/brand";
import styles from "@/styles/login.module.css";

export default function TrialPage() {
  return (
    <section className={styles.shell} aria-label={`${BRAND_NAME} 申请试用`}>
      <LoginBrandPanel />
      <TrialRequestForm />
      <LoginFooter />
    </section>
  );
}
