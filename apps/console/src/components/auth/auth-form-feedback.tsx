"use client";

import { Loader2 } from "lucide-react";

import styles from "@/styles/login.module.css";

export type AuthFeedbackTone = "idle" | "loading" | "success" | "error" | "hint";

export interface AuthFormFeedbackProps {
  tone: AuthFeedbackTone;
  message?: string;
}

export function AuthFormFeedback({ tone, message }: AuthFormFeedbackProps) {
  if (!message && tone !== "loading") {
    return <p className={styles.message} aria-live="polite" />;
  }

  const className =
    tone === "success"
      ? `${styles.message} ${styles.messageOk} ${styles.messageAnimate}`
      : tone === "error"
        ? `${styles.message} ${styles.messageBad} ${styles.messageAnimate}`
        : tone === "hint"
          ? `${styles.message} ${styles.messageHint} ${styles.messageAnimate}`
          : `${styles.message} ${styles.messageAnimate}`;

  return (
    <p className={className} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      {tone === "loading" ? (
        <span className={styles.messageLoading}>
          <Loader2 className={styles.messageSpinnerIcon} aria-hidden />
          {message ?? "处理中…"}
        </span>
      ) : (
        message
      )}
    </p>
  );
}

export function AuthFieldError({ message }: { message?: string }) {
  return (
    <span className={styles.fieldError} role="alert" aria-live="polite">
      {message ?? ""}
    </span>
  );
}
