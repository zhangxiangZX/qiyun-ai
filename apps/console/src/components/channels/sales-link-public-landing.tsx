"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  formatAcquisitionSourceLabel,
  resolveAcquisitionSource,
} from "@/lib/public/acquisition-source";
import styles from "@/styles/public-acquisition.module.css";

/**
 * Soft landing for sales short-links in WeChat WebView.
 * Navigates to `/public/sales-links/:slug` (BFF 302) while preserving `source`.
 */
export function SalesLinkPublicLanding({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const source = useMemo(() => resolveAcquisitionSource(searchParams), [searchParams]);
  const [stuck, setStuck] = useState(false);

  const redirectHref = useMemo(() => {
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.set(key, value);
    });
    if (source) params.set("source", source);
    const qs = params.toString();
    return `/public/sales-links/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
  }, [slug, searchParams, source]);

  useEffect(() => {
    const go = window.setTimeout(() => {
      window.location.replace(redirectHref);
    }, 280);
    const stuckTimer = window.setTimeout(() => setStuck(true), 2500);
    return () => {
      window.clearTimeout(go);
      window.clearTimeout(stuckTimer);
    };
  }, [redirectHref]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.center}>
          <div className={styles.spinner} aria-hidden />
          <h1 className={styles.title}>正在打开…</h1>
          <p className={styles.sub}>
            {source
              ? `来源：${formatAcquisitionSourceLabel(source)}，即将跳转到目标页面`
              : "即将跳转到目标页面"}
          </p>
          {stuck ? (
            <a className={styles.ctaSecondary} href={redirectHref}>
              若未自动跳转，请点此继续
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
