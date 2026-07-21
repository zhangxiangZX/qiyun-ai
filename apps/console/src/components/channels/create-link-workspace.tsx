"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Copy,
  Download,
  Globe,
  Link2,
  Check,
  QrCode as QrCodeIcon,
  Target,
} from "lucide-react";

import { QrCode, Skeleton } from "@qiyun/ui";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import { listSelectionPages, type SelectionPageView } from "@/lib/bots/selection-pages-api";
import { createSalesLink } from "@/lib/channels/api";
import type { SalesLinkChannel } from "@/lib/channels/types";
import styles from "@/styles/sales-links.module.css";

function selectionPagePath(slug: string) {
  return `/s/${slug}`;
}

function salesLinkPath(slug: string) {
  return `/public/sales-links/${slug}`;
}

/** Local absolute URL base — no custom domain; prefer API when set for short-link redirects. */
function resolveShortLinkBase(origin: string) {
  const entry = process.env.NEXT_PUBLIC_ENTRY_URL?.replace(/\/$/, "");
  if (entry) return entry;
  const api = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (api) return api;
  return origin;
}

function toAbsoluteUrl(base: string, pathOrUrl: string) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  if (!base) return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

function toDisplayUrl(raw: string | null | undefined, fallbackSlug: string, shortLinkBase: string) {
  const value = raw?.trim();
  if (!value) return toAbsoluteUrl(shortLinkBase, salesLinkPath(fallbackSlug));
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return toAbsoluteUrl(shortLinkBase, value);
  try {
    return new URL(value).href;
  } catch {
    return toAbsoluteUrl(shortLinkBase, salesLinkPath(fallbackSlug));
  }
}

const CHANNEL_OPTIONS: Array<{ value: SalesLinkChannel; label: string }> = [
  { value: "google_ads", label: "Google Ads" },
  { value: "douyin", label: "抖音" },
  { value: "email", label: "邮件营销" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "zhanli", label: "独立站" },
  { value: "pc", label: "官网底部" },
];

const MOCK_LANDING_PAGES: SelectionPageView[] = [
  {
    id: "mock-sel-1",
    name: "户外机柜选型页",
    slug: "outdoor-cabinet",
    description: "展会与官网常用选型落地页",
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 6,
    requiredQuestionCount: 3,
    questions: [],
    primaryColor: null,
  },
  {
    id: "mock-sel-2",
    name: "工业空调选型页",
    slug: "industrial-ac",
    description: "产品资料与询价入口",
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questionCount: 5,
    requiredQuestionCount: 2,
    questions: [],
    primaryColor: null,
  },
];

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}

export function CreateLinkWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQrcode = searchParams.get("type") === "qrcode";

  const [name, setName] = useState("");
  const [channelMode, setChannelMode] = useState<"all" | "exclusive">("all");
  const [channel, setChannel] = useState<SalesLinkChannel>("google_ads");
  const [landingPages, setLandingPages] = useState<SelectionPageView[]>([]);
  const [landingLoading, setLandingLoading] = useState(true);
  const [selectedLandingId, setSelectedLandingId] = useState("");
  const [formRequired, setFormRequired] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdLinkUrl, setCreatedLinkUrl] = useState<string | null>(null);
  const [localOrigin, setLocalOrigin] = useState("");

  useEffect(() => {
    setLocalOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLandingLoading(true);
      try {
        const pages = await listSelectionPages();
        const published = pages.filter((page) => page.status === "published");
        if (cancelled) return;
        if (published.length > 0) {
          setLandingPages(published);
          setSelectedLandingId(published[0]?.id ?? "");
        } else {
          setLandingPages(MOCK_LANDING_PAGES);
          setSelectedLandingId(MOCK_LANDING_PAGES[0]?.id ?? "");
        }
      } catch {
        if (cancelled) return;
        setLandingPages(MOCK_LANDING_PAGES);
        setSelectedLandingId(MOCK_LANDING_PAGES[0]?.id ?? "");
      } finally {
        if (!cancelled) setLandingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLanding = useMemo(
    () => landingPages.find((page) => page.id === selectedLandingId) ?? null,
    [landingPages, selectedLandingId],
  );

  const shortLinkBase = useMemo(() => resolveShortLinkBase(localOrigin), [localOrigin]);

  const landingUrl = useMemo(() => {
    if (!selectedLanding) return "";
    // Selection pages are served by Console — use current origin for local access.
    return toAbsoluteUrl(localOrigin, selectionPagePath(selectedLanding.slug));
  }, [localOrigin, selectedLanding]);

  const draftSlug = useMemo(() => {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    return base || "your-link";
  }, [name]);

  const previewUrl = useMemo(() => {
    if (createdLinkUrl) return createdLinkUrl;
    return toAbsoluteUrl(shortLinkBase, salesLinkPath(draftSlug));
  }, [createdLinkUrl, draftSlug, shortLinkBase]);

  const backHref = isQrcode ? "/dashboard/channels/qrcodes" : "/dashboard/channels/links";
  const pageTitle = isQrcode ? "创建二维码" : "创建销售链接";
  const namePlaceholder = isQrcode ? "例如：展会机柜手册二维码" : "例如：展会现场咨询链接";

  const copyUrl = () => {
    void navigator.clipboard?.writeText(previewUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("请填写链接名称。");
      return;
    }
    if (trimmedName.length > 30) {
      setErrorMessage("链接名称不能超过 30 个字符。");
      return;
    }
    if (!landingUrl) {
      setErrorMessage("请选择要绑定的落地页（AI 选型页）。");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const created = await createSalesLink({
        name: trimmedName,
        channel: channelMode === "all" ? "other" : channel,
        // Absolute local URL so API redirect + browser open both work without custom domain.
        targetUrl: landingUrl,
      });
      setCreatedLinkUrl(toDisplayUrl(created.shortUrl, created.slug, shortLinkBase));
      window.sessionStorage.setItem("sales-link-saved", "1");
      router.push(`/dashboard/channels/links/${encodeURIComponent(created.id)}`);
    } catch (error) {
      if (isPreviewModeError(error)) {
        setCreatedLinkUrl(toAbsoluteUrl(shortLinkBase, salesLinkPath("preview-link")));
        window.sessionStorage.setItem("sales-link-saved", "1");
        router.push(backHref);
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "创建失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature={isQrcode ? "二维码" : "销售链接"} />
        {errorMessage ? (
          <ConsoleFeedback
            variant="error"
            title="保存失败"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}
      </ConsolePageAlerts>

      <div className={styles.createPage}>
        <div className={styles.createTopBar}>
          <Link href={backHref} className={styles.createBack}>
            <ChevronLeft className="h-4 w-4" />
            {isQrcode ? "返回二维码管理" : "返回销售链接列表"}
          </Link>
          <div className={styles.createTopActions}>
            <Link href={backHref} className={styles.btnOutline}>
              取消
            </Link>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void handleSave()}
              disabled={saving || landingLoading}
            >
              {saving ? "创建中..." : isQrcode ? "创建并生成二维码" : "创建并生成"}
            </button>
          </div>
        </div>

        <div className={styles.createGrid}>
          <div className={styles.createMain}>
            <section className={styles.formCard}>
              <div className={styles.formCardHead}>
                <h1 className={styles.createTitle}>{pageTitle}</h1>
                <p className={styles.createHint}>
                  选择已发布的 AI 选型页作为落地页；地址使用当前本地环境，暂不配置自定义域名。
                </p>
              </div>

              <div className={styles.field}>
                <label htmlFor="link-name">
                  {isQrcode ? "二维码名称" : "链接名称"}{" "}
                  <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="link-name"
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                />
                <div className={styles.charCount}>{name.length}/30</div>
              </div>

              <div className={styles.field}>
                <label htmlFor="landing-page">
                  绑定落地页 <span className={styles.requiredMark}>*</span>
                </label>
                {landingLoading ? (
                  <Skeleton className="h-[38px] w-full rounded-lg" />
                ) : (
                  <select
                    id="landing-page"
                    className={styles.channelSelect}
                    style={{ marginTop: 0 }}
                    value={selectedLandingId}
                    onChange={(e) => setSelectedLandingId(e.target.value)}
                  >
                    {landingPages.length === 0 ? (
                      <option value="">暂无已发布的 AI 选型页</option>
                    ) : (
                      landingPages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
                {landingUrl ? (
                  <p className={styles.fieldHint}>
                    本地落地页：{" "}
                    <a
                      href={landingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {landingUrl}
                    </a>
                  </p>
                ) : (
                  <p className={styles.fieldHint}>
                    还没有可用落地页？先去{" "}
                    <Link href="/dashboard/bots/landing" className="text-primary hover:underline">
                      AI 选型页
                    </Link>{" "}
                    发布一页。
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label>
                  选择渠道 <span className={styles.requiredMark}>*</span>
                </label>
                <div className={styles.channelMode} role="tablist" aria-label="渠道模式">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channelMode === "all"}
                    className={`${styles.channelModeBtn} ${channelMode === "all" ? styles.channelModeActive : ""}`}
                    onClick={() => setChannelMode("all")}
                  >
                    <Globe size={15} />
                    全部渠道
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channelMode === "exclusive"}
                    className={`${styles.channelModeBtn} ${channelMode === "exclusive" ? styles.channelModeActive : ""}`}
                    onClick={() => setChannelMode("exclusive")}
                  >
                    <Target size={15} />
                    专属渠道
                  </button>
                </div>
                {channelMode === "exclusive" ? (
                  <select
                    className={styles.channelSelect}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as SalesLinkChannel)}
                    aria-label="专属渠道"
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.fieldHint}>适用于多渠道共用同一入口，统计汇总到「其他」渠道。</p>
                )}
              </div>
            </section>

            <section className={styles.formCard}>
              <h2 className={styles.formCardTitle}>获客设置</h2>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>客户填写表单</div>
                  <div className={styles.settingDesc}>访客需留资后才能继续咨询</div>
                </div>
                <ToggleSwitch on={formRequired} onChange={setFormRequired} />
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>自动分配</div>
                  <div className={styles.settingDesc}>提交后自动分配给关联员工</div>
                </div>
                <ToggleSwitch on={autoAssign} onChange={setAutoAssign} />
              </div>
            </section>
          </div>

          <aside className={styles.createPreview}>
            <section className={`${styles.formCard} ${styles.previewSticky}`}>
              <div className={styles.previewHead}>
                <h2 className={styles.formCardTitle}>实时预览</h2>
                <span className={styles.previewBadge}>
                  {isQrcode ? <QrCodeIcon size={12} /> : <Link2 size={12} />}
                  {isQrcode ? "二维码" : "链接"}
                </span>
              </div>

              <div className={styles.previewName}>
                {name.trim() || (isQrcode ? "未命名二维码" : "未命名链接")}
              </div>

              <div className={styles.previewMeta}>
                <div className={styles.previewMetaLabel}>短链地址（创建后自动生成）</div>
                <div className={styles.previewUrl}>
                  <span className={styles.previewUrlText} title={previewUrl}>
                    <Link2 size={14} className="shrink-0 text-primary" />
                    {previewUrl || "等待本地地址…"}
                  </span>
                  <button type="button" className={styles.btnLink} onClick={copyUrl} disabled={!previewUrl}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              </div>

              {landingUrl ? (
                <div className={styles.previewMeta}>
                  <div className={styles.previewMetaLabel}>跳转落地页（可本地打开）</div>
                  <p className={styles.previewLanding}>
                    {selectedLanding?.name} ·{" "}
                    <a
                      href={landingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {landingUrl}
                    </a>
                  </p>
                </div>
              ) : null}

              <div className={styles.qrPreview}>
                {saving ? (
                  <Skeleton className="h-[168px] w-[168px] rounded-lg" />
                ) : (
                  <QrCode value={previewUrl || landingUrl || "about:blank"} size={168} level="M" />
                )}
                <p className={styles.previewTip}>
                  {createdLinkUrl
                    ? "已生成本地可访问地址；自定义域名后续再绑定"
                    : "当前为本地预览地址；创建后生成正式短链"}
                </p>
                <button
                  type="button"
                  className={styles.btnOutline}
                  disabled={!createdLinkUrl}
                  title={createdLinkUrl ? "下载二维码" : "请先创建后再下载"}
                >
                  <Download size={14} />
                  下载二维码
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ConsolePage>
  );
}
