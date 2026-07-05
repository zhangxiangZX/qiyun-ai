"use client";

import { useEffect } from "react";

import { Alert } from "@qiyun/ui";

export interface ConsoleFeedbackProps {
  variant: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function ConsoleFeedback({
  variant,
  title,
  message,
  onDismiss,
  autoDismissMs = 3200,
}: ConsoleFeedbackProps) {
  useEffect(() => {
    if (!onDismiss || !autoDismissMs) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss, title]);

  return (
    <Alert variant={variant} title={title}>
      {message}
    </Alert>
  );
}
