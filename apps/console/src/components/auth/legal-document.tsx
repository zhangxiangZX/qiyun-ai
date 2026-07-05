import Link from "next/link";

import styles from "@/styles/login.module.css";

export function LegalDocument({
  title,
  updatedAt,
  sections,
}: {
  title: string;
  updatedAt: string;
  sections: Array<{ heading: string; body: string[] }>;
}) {
  return (
    <section className={styles.formPanel} aria-label={title}>
      <article className={`${styles.form} ${styles.legalPanel}`}>
        <header className={styles.header}>
          <h2>{title}</h2>
          <p>最近更新：{updatedAt}</p>
        </header>
        <div className={styles.legalBody}>
          {sections.map((section) => (
            <section key={section.heading} className={styles.legalSection}>
              <h3>{section.heading}</h3>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        <div className={styles.authPageActions}>
          <Link href="/login">返回登录</Link>
          <Link href="/trial">申请试用</Link>
        </div>
      </article>
    </section>
  );
}
