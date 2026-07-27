"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  Link2,
  MoreHorizontal,
  QrCode as QrCodeIcon,
  User,
} from "lucide-react";

import { Button, QrCode as QrCodeComp, Skeleton } from "@qiyun/ui";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { MiniLineChart } from "@/components/dashboard/charts/mini-line-chart";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  buildMockScanLogs,
  getSalesLink,
  getSalesLinkScanLogs,
  resolveSalesLinkPublicUrl,
  updateSalesLink,
  type SalesLinkScanLog,
  type SalesLinkView,
} from "@/lib/channels/api";
import { getSalesLinkById, mockSalesLinks } from "@/lib/channels/links-mock-data";
import styles from "@/styles/sales-links.module.css";

function ToggleSwitch({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function refererHost(referer?: string | null): string {
  if (!referer) return "直接访问";
  try {
    return new URL(referer).host;
  } catch {
    return referer;
  }
}

function buildTrend(logs: SalesLinkScanLog[]) {
  const buckets: { key: string; label: string; total: number; qr: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    buckets.push({ key, label: `${d.getMonth() + 1}-${d.getDate()}`, total: 0, qr: 0 });
  }
  for (const log of logs) {
    const d = new Date(log.scannedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.total += 1;
      if (log.source === "qrcode") bucket.qr += 1;
    }
  }
  return {
    labels: buckets.map((b) => b.label),
    total: buckets.map((b) => b.total),
    qr: buckets.map((b) => b.qr),
  };
}

export function SalesLinkDetailWorkspace() {
  const params = useParams<{ id: string }>();
  const linkId = params?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [link, setLink] = useState<SalesLinkView | null>(null);
  const [scanLogs, setScanLogs] = useState<SalesLinkScanLog[]>([]);
  const [copied, setCopied] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [linkEnabled, setLinkEnabled] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!linkId) return;
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode();
      const preview = isPreviewMode(mode);
      setIsPreview(preview);
      if (preview) {
        const nextLink = await getSalesLinkById(linkId);
        const fallback =
          mockSalesLinks.find((entry) => entry.id === linkId) ?? mockSalesLinks[0] ?? null;
        const source = nextLink ?? fallback;
        setLink(
          source
            ? {
                ...source,
                slug: source.id,
                targetUrl: null,
                createdAt: source.lastUpdated,
                updatedAt: source.lastUpdated,
              }
            : null,
        );
        setLinkEnabled(source?.status === "active");
        setScanLogs(source ? buildMockScanLogs(source.id) : []);
        return;
      }
      const item = await getSalesLink(linkId);
      setLink(item);
      setLinkEnabled(item.status === "active");
      try {
        const logs = await getSalesLinkScanLogs(linkId);
        setScanLogs(logs);
      } catch {
        setScanLogs([]);
        setStatusError("访问记录加载失败，请稍后刷新。");
      }
    } catch (nextError) {
      setLink(null);
      setScanLogs([]);
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLinkStatusChange = async (enabled: boolean) => {
    if (!link) return;
    if (isPreview) {
      setLinkEnabled(enabled);
      return;
    }
    const previous = linkEnabled;
    setLinkEnabled(enabled);
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await updateSalesLink(linkId, { status: enabled ? "active" : "inactive" });
      setLink(updated);
      setLinkEnabled(updated.status === "active");
    } catch (nextError) {
      setLinkEnabled(previous);
      setStatusError(nextError instanceof Error ? nextError.message : "状态更新失败");
    } finally {
      setStatusSaving(false);
    }
  };

  const fullUrl = link ? resolveSalesLinkPublicUrl(link) : "";
  const qrUrl = useMemo(() => {
    if (!fullUrl) return "";
    return `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}src=qrcode`;
  }, [fullUrl]);

  const qrPanelRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (!fullUrl) return;
    void navigator.clipboard?.writeText(fullUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadQr = () => {
    const svg = qrPanelRef.current?.querySelector("svg");
    if (!svg) {
      setDownloadNotice(true);
      return;
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${link?.name || "sales-link"}-qrcode.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const qrScanCount = useMemo(
    () => scanLogs.filter((log) => log.source === "qrcode").length,
    [scanLogs],
  );
  const trend = useMemo(() => buildTrend(scanLogs), [scanLogs]);
  const recentActivity = useMemo(() => scanLogs.slice(0, 5), [scanLogs]);
  const scanRecords = useMemo(() => scanLogs.slice(0, 12), [scanLogs]);

  if (loading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="销售链接" />
        </ConsolePageAlerts>
        <div className={`${styles.page} space-y-4`}>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </ConsolePage>
    );
  }

  if (error || !link) {
    const presentation = resolveRequestErrorPresentation(error, "无法加载销售链接详情。");
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="销售链接" />
        </ConsolePageAlerts>
        <div className={`${styles.page} space-y-4`}>
          <Link
            href="/dashboard/channels/links"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回销售链接列表
          </Link>
          <ConsoleRequestError
            kind={presentation.kind}
            message={presentation.message}
            onRetry={() => void load()}
          />
        </div>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="销售链接" />
        {copied ? (
          <ConsoleFeedback
            variant="success"
            title="链接已复制"
            message="可直接粘贴分享给客户或渠道伙伴。"
            onDismiss={() => setCopied(false)}
          />
        ) : null}
        {downloadNotice ? (
          <ConsoleFeedback
            variant="warning"
            title="暂无法下载二维码"
            message="页面上未找到可导出的二维码，请确认链接已生成后再试。"
            onDismiss={() => setDownloadNotice(false)}
          />
        ) : null}
        {statusError ? (
          <ConsoleFeedback
            variant="error"
            title="链接状态更新失败"
            message={statusError}
            onDismiss={() => setStatusError(null)}
          />
        ) : null}
      </ConsolePageAlerts>

      <div className={`${styles.page} space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard/channels/links" className="hover:text-primary">
              ← 返回销售链接
            </Link>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-1.5 h-4 w-4" />
              复制链接
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadQr}>
              <Download className="mr-1.5 h-4 w-4" />
              下载二维码
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal size={16} />
            </Button>
          </div>
        </div>

        <div className={styles.detailHero}>
          <span className={styles.heroIcon}>
            <User size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className={styles.heroTitle}>
              {link.name}
              <span
                className={`${styles.statusBadge} ${
                  link.status === "active" ? styles.statusActive : styles.statusInactive
                }`}
              >
                {link.status === "active" ? "启用中" : "已停用"}
              </span>
            </h1>
            <div className={styles.heroMeta}>
              <span>投放渠道：{link.channelLabel}</span>
              <span>创建时间：{formatDateTime(link.createdAt)}</span>
              <span>创建人：{link.creator}</span>
            </div>
          </div>
        </div>

        <div className={styles.metricsBar}>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>访问量</div>
            <div className={styles.metricValue}>{link.visits.toLocaleString()}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>线索数</div>
            <div className={styles.metricValue}>{link.inquiries}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>转化率</div>
            <div className={styles.metricValue}>
              {typeof link.conversionRate === "number"
                ? `${link.conversionRate.toFixed(2)}%`
                : "0.00%"}
            </div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>二维码扫码</div>
            <div className={styles.metricValue}>{qrScanCount}</div>
          </div>
        </div>

        <div className={styles.detailGrid}>
          <section className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>链接信息</h3>
            <div className={styles.previewUrl}>
              <span className="truncate font-mono">{fullUrl}</span>
              <button type="button" className={styles.btnLink} onClick={handleCopy}>
                复制
              </button>
            </div>
            <div className="flex items-start gap-4">
              <div ref={qrPanelRef} className="rounded-lg border border-border bg-background p-3">
                <QrCodeComp value={qrUrl} size={140} />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                  <Download className="mr-1.5 h-4 w-4" />
                  下载
                </Button>
                <Button variant="outline" size="sm">
                  更换
                </Button>
              </div>
            </div>
          </section>

          <section className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>链接设置</h3>
            <div className={styles.settingRow}>
              <span className="text-muted-foreground">引导标题</span>
              <span>{link.name}</span>
            </div>
            <div className={styles.settingRow}>
              <span className="text-muted-foreground">投放渠道</span>
              <span>{link.channelLabel}</span>
            </div>
            <div className={styles.settingRow}>
              <span className="text-muted-foreground">创建时间</span>
              <span>{formatDateTime(link.createdAt)}</span>
            </div>
            <div className={styles.settingRow}>
              <span className="text-muted-foreground">最近更新</span>
              <span>{formatDateTime(link.updatedAt)}</span>
            </div>
            <div className={styles.settingRow}>
              <span>客户填写表单</span>
              <ToggleSwitch on={formEnabled} onChange={setFormEnabled} />
            </div>
            <div className={styles.settingRow}>
              <span>自动分配</span>
              <ToggleSwitch on={autoAssign} onChange={setAutoAssign} />
            </div>
            <div className={styles.settingRow}>
              <span>链接状态</span>
              <div className="flex items-center gap-2">
                <span className={linkEnabled ? styles.statusActive : styles.statusInactive}>
                  {linkEnabled ? "启用中" : "已停用"}
                </span>
                <ToggleSwitch
                  on={linkEnabled}
                  disabled={statusSaving}
                  onChange={(value) => void handleLinkStatusChange(value)}
                />
              </div>
            </div>
          </section>
        </div>

        <div className={styles.detailGrid}>
          <section className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>数据趋势（近7天）</h3>
            <MiniLineChart
              series={[
                { label: "访问量", data: trend.total, color: "#1768f2" },
                { label: "二维码扫码", data: trend.qr, color: "#16b364" },
              ]}
              labels={trend.labels}
              width={520}
              height={230}
              showYAxis
            />
          </section>
          <section className={styles.detailCard}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className={styles.detailCardTitle} style={{ margin: 0 }}>
                二维码扫描记录
              </h3>
              <span className="text-xs text-muted-foreground">共 {scanLogs.length} 条</span>
            </div>
            {scanRecords.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无扫描记录</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {scanRecords.map((log) => {
                  const isQr = log.source === "qrcode";
                  return (
                    <li key={log.id} className="flex items-start gap-3 py-3">
                      <span
                        className={`${styles.avatar} ${
                          isQr ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {isQr ? <QrCodeIcon size={14} /> : <Link2 size={14} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-sm">
                          {isQr ? "二维码扫码" : "链接访问"}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {refererHost(log.referer)}
                          </span>
                        </b>
                        <small className="text-muted-foreground">{formatDateTime(log.scannedAt)}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className={styles.detailGrid}>
          <section className={styles.detailCard}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className={styles.detailCardTitle} style={{ margin: 0 }}>
                最近动态
              </h3>
              <button type="button" className={styles.btnLink}>
                查看全部记录 &gt;
              </button>
            </div>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无动态</p>
            ) : (
              <ol className="space-y-4 border-l border-border pl-4 text-sm">
                {recentActivity.map((log) => (
                  <li key={log.id}>
                    <b>{log.source === "qrcode" ? "客户扫描了二维码" : "客户访问了链接"}</b>
                    <small className="mt-1 block text-muted-foreground">
                      {formatDateTime(log.scannedAt)}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>分配管理</h3>
            <dl className="grid grid-cols-[100px_1fr] gap-y-4 text-sm">
              <dt className="text-muted-foreground">创建人</dt>
              <dd>{link.creator}</dd>
              <dt className="text-muted-foreground">当前负责人</dt>
              <dd>
                {link.creator} <button className={`${styles.btnLink} ml-2`}>更换</button>
              </dd>
              <dt className="text-muted-foreground">投放渠道</dt>
              <dd>{link.channelLabel}</dd>
              <dt className="text-muted-foreground">创建时间</dt>
              <dd>{formatDateTime(link.createdAt)}</dd>
            </dl>
          </section>
        </div>
      </div>
    </ConsolePage>
  );
}
