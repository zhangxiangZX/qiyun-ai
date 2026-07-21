"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import {
  formatAcquisitionSourceLabel,
  resolveAcquisitionSource,
} from "@/lib/public/acquisition-source";
import styles from "@/styles/public-acquisition.module.css";

/**
 * Public inquiry submit success — no dashboard shell / login cookies.
 */
export function PublicSubmitSuccessPage() {
  const searchParams = useSearchParams();
  const source = useMemo(() => resolveAcquisitionSource(searchParams), [searchParams]);
  const title = searchParams.get("title")?.trim() || "提交成功！";
  const message =
    searchParams.get("message")?.trim() ||
    "感谢您的提交，我们会尽快与您联系。客服通常在 1 个工作日内回电。";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.center}>
          <CheckCircle2 size={56} color="#22c55e" aria-hidden />
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>{message}</p>
          {source ? (
            <p className={styles.muted}>来源：{formatAcquisitionSourceLabel(source)}</p>
          ) : null}
          <button
            type="button"
            className={styles.cta}
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
