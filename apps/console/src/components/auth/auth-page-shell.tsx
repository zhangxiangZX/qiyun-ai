import type { ReactNode } from "react";

import styles from "@/styles/login.module.css";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}
