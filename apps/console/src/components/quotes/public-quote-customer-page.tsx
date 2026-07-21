"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Phone } from "lucide-react";

import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  formatAcquisitionSourceLabel,
  resolveAcquisitionSource,
} from "@/lib/public/acquisition-source";
import { useVisualViewportBottomInset } from "@/lib/public/use-visual-viewport-bottom-inset";
import styles from "@/styles/public-acquisition.module.css";

interface PublicQuoteProduct {
  name?: string;
  model?: string;
  unit?: string;
  deliveryCycle?: string;
  qty?: number;
  price?: number;
  amount?: number;
}

interface PublicQuotePayload {
  id?: string;
  title?: string;
  customerName?: string;
  estimatedAmount?: number | null;
  publicConfirmedAt?: string | null;
  document?: {
    html?: string;
    sample?: {
      quoteNo?: string;
      date?: string;
      validUntil?: string;
      currency?: string;
      company?: { name?: string };
      customer?: { contact?: string; company?: string };
      products?: PublicQuoteProduct[];
    };
    template?: {
      terms?: { validity?: string; payment?: string; delivery?: string };
    };
  };
}

function formatCNY(value: number): string {
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Customer-facing quote view for WeChat / mobile.
 * Loads `/api/public/quotes/:token` — does not use dashboard auth cookies.
 */
export function PublicQuoteCustomerPage({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const source = useMemo(() => resolveAcquisitionSource(searchParams), [searchParams]);
  const keyboardInset = useVisualViewportBottomInset();
  const [data, setData] = useState<PublicQuotePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/public/quotes/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          let message = "报价链接无效或已失效";
          try {
            const body = (await response.json()) as { message?: string };
            if (body.message) message = body.message;
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }
        const payload = unwrapEnvelope<PublicQuotePayload>(await response.json());
        if (!active) return;
        setData(payload);
        setConfirmedAt(payload?.publicConfirmedAt ?? null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const sample = data?.document?.sample;
  const products = sample?.products ?? [];
  const subtotal = products.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  async function handleConfirm() {
    if (confirming || confirmedAt) return;
    setActionError(null);
    setConfirming(true);
    try {
      const response = await fetch(`/api/public/quotes/${encodeURIComponent(token)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmed", source: source || undefined }),
        cache: "no-store",
      });
      if (!response.ok) {
        let message = "确认失败，请稍后重试";
        try {
          const body = (await response.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const result = unwrapEnvelope<{ confirmedAt?: string }>(await response.json());
      setConfirmedAt(result?.confirmedAt ?? new Date().toISOString());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "确认失败");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.center}>
            <div className={styles.spinner} aria-hidden />
            <p className={styles.sub}>正在加载报价…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.center}>
            <AlertCircle size={36} color="#dc2626" />
            <h1 className={styles.title}>无法打开报价</h1>
            <p className={styles.error}>{error ?? "报价不存在"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {sample?.company?.name ?? "专属报价"}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {data.title ?? "您的专属报价"}
          </h1>
          {source ? (
            <p className={styles.muted} style={{ marginTop: 6 }}>
              来源：{formatAcquisitionSourceLabel(source)}
            </p>
          ) : null}
        </header>

        <div className={styles.cardList}>
          <div className={styles.card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div className={styles.muted}>报价单号</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sample?.quoteNo ?? "—"}</div>
              </div>
              <div>
                <div className={styles.muted}>报价日期</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sample?.date ?? "—"}</div>
              </div>
              <div>
                <div className={styles.muted}>有效期至</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sample?.validUntil ?? "—"}</div>
              </div>
              <div>
                <div className={styles.muted}>客户</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {sample?.customer?.contact ?? data.customerName ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>产品与服务</div>
            {products.length === 0 ? (
              <p className={styles.muted}>暂无明细，请联系销售确认方案。</p>
            ) : (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>规格</th>
                      <th>数量</th>
                      <th>金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item, index) => (
                      <tr key={`${item.name ?? "p"}-${index}`}>
                        <td>{item.name ?? "—"}</td>
                        <td>{item.model ?? "—"}</td>
                        <td>{item.qty ?? "—"}</td>
                        <td>{formatCNY(item.amount ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <span className={styles.muted}>合计（参考）</span>
              <strong style={{ color: "#2563eb" }}>
                {formatCNY(
                  typeof data.estimatedAmount === "number" ? data.estimatedAmount : subtotal,
                )}
              </strong>
            </div>
          </div>

          {data.document?.template?.terms ? (
            <div className={styles.card}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>交易条款</div>
              <p className={styles.muted}>有效期：{data.document.template.terms.validity ?? "—"}</p>
              <p className={styles.muted}>付款：{data.document.template.terms.payment ?? "—"}</p>
              <p className={styles.muted}>交付：{data.document.template.terms.delivery ?? "—"}</p>
            </div>
          ) : null}

          {actionError ? (
            <div className={styles.card} style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
              <p className={styles.error} style={{ margin: 0 }}>
                {actionError}
              </p>
            </div>
          ) : null}
        </div>

        <div
          className={styles.stickyBar}
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: keyboardInset,
            maxWidth: 430,
          }}
        >
          <button
            type="button"
            className={styles.cta}
            style={{ marginTop: 0, maxWidth: "none" }}
            disabled={Boolean(confirmedAt) || confirming}
            onClick={() => void handleConfirm()}
          >
            {confirmedAt ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} /> 已确认报价
              </span>
            ) : confirming ? (
              "确认中…"
            ) : (
              "确认报价"
            )}
          </button>
          <p className={styles.muted} style={{ margin: 0, textAlign: "center" }}>
            <Phone size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
            如需修改方案，请联系您的销售顾问
            <FileText size={12} style={{ display: "inline", marginLeft: 8, marginRight: 4, verticalAlign: -1 }} />
            本页无需登录
          </p>
        </div>
      </div>
    </div>
  );
}
