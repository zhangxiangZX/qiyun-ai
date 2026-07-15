"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  Copy,
  Download,
  Globe,
  Link2,
  Check,
  Target,
} from "lucide-react";

import { QrCode, Skeleton } from "@qiyun/ui";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import { BRAND_DOMAIN, PUBLIC_ENTRY_URL } from "@/lib/brand";
import { createSalesLink, resolveSalesLinkPublicUrl } from "@/lib/channels/api";
import type { SalesLinkChannel } from "@/lib/channels/types";
import styles from "@/styles/sales-links.module.css";

const CHANNEL_OPTIONS: Array<{ value: SalesLinkChannel; label: string }> = [
  { value: "google_ads", label: "Google Ads" },
  { value: "douyin", label: "抖音" },
  { value: "email", label: "邮件营销" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "zhanli", label: "独立站" },
  { value: "pc", label: "官网底部" },
];

function ToggleSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <button
        type="button"
        className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
        aria-pressed={on}
        onClick={() => onChange(!on)}
      >
        <span className={styles.toggleKnob} />
      </button>
    </div>
  );
}

export function CreateLinkWorkspace() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [channelMode, setChannelMode] = useState<"all" | "exclusive">("exclusive");
  const [channel, setChannel] = useState<SalesLinkChannel>("google_ads");
  const [targetUrl, setTargetUrl] = useState("");
  const [formRequired, setFormRequired] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdLinkUrl, setCreatedLinkUrl] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (createdLinkUrl) return createdLinkUrl;
    return `${PUBLIC_ENTRY_URL}/public/sales-links/（创建后生成）`;
  }, [createdLinkUrl]);

  const copyUrl = () => {
    if (!createdLinkUrl) return;
    void navigator.clipboard?.writeText(createdLinkUrl);
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

    setSaving(true);
    setErrorMessage(null);

    try {
      const created = await createSalesLink({
        name: trimmedName,
        channel: channelMode === "all" ? "other" : channel,
        targetUrl: targetUrl.trim() || undefined,
      });
      const publicUrl = resolveSalesLinkPublicUrl(created);
      setCreatedLinkUrl(publicUrl);
      window.sessionStorage.setItem("sales-link-saved", "1");
      router.push(`/dashboard/channels/links/${encodeURIComponent(created.id)}`);
    } catch (error) {
      if (isPreviewModeError(error)) {
        const mockUrl = `${PUBLIC_ENTRY_URL}/public/sales-links/preview-link`;
        setCreatedLinkUrl(mockUrl);
        window.sessionStorage.setItem("sales-link-saved", "1");
        router.push("/dashboard/channels/links");
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
        <ConsoleDataModeBanner feature="销售链接" />
        {errorMessage ? (
          <ConsoleFeedback
            variant="error"
            title="保存失败"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}
      </ConsolePageAlerts>

      <div className={`${styles.page} py-4`}>
        <Link
          href="/dashboard/channels/links"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          返回销售链接列表
        </Link>

        <div className={styles.pageHeader}>
          <h1>创建销售链接 / 二维码</h1>
          <p>营销中心 / 销售链接 / 创建</p>
        </div>

        <div className={styles.createGrid}>
          <div>
            <section className={styles.formCard}>
              <h3 className={styles.formCardTitle}>基本信息</h3>
              <div className={styles.field}>
                <label>
                  链接名称 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：展会现场咨询链接"
                />
                <div className={styles.charCount}>{name.length}/30</div>
              </div>
              <div className={styles.field}>
                <label>落地页 URL（选填）</label>
                <input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={`https://${BRAND_DOMAIN}/products`}
                />
              </div>
              <div className={styles.field}>
                <label>
                  选择渠道 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className={styles.channelMode}>
                  <button
                    type="button"
                    className={`${styles.channelModeBtn} ${channelMode === "all" ? styles.channelModeActive : ""}`}
                    onClick={() => setChannelMode("all")}
                  >
                    <Globe size={16} />
                    全部渠道
                  </button>
                  <button
                    type="button"
                    className={`${styles.channelModeBtn} ${channelMode === "exclusive" ? styles.channelModeActive : ""}`}
                    onClick={() => setChannelMode("exclusive")}
                  >
                    <Target size={16} />
                    专属渠道
                  </button>
                </div>
                {channelMode === "exclusive" ? (
                  <select
                    className="mt-3"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as SalesLinkChannel)}
                    style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #e5e7eb", padding: "0 12px" }}
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </section>

            <section className={styles.formCard}>
              <h3 className={styles.formCardTitle}>设置</h3>
              <div className={styles.settingRow}>
                <div>
                  <div className="font-medium text-foreground">客户填写表单</div>
                  <div className="text-xs text-muted-foreground">访客需留资后才能继续咨询</div>
                </div>
                <ToggleSwitch on={formRequired} onChange={setFormRequired} label={formRequired ? "开启" : "关闭"} />
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className="font-medium text-foreground">自动分配</div>
                  <div className="text-xs text-muted-foreground">提交后自动分配给关联员工</div>
                </div>
                <ToggleSwitch on={autoAssign} onChange={setAutoAssign} label={autoAssign ? "开启" : "关闭"} />
              </div>
              <p className="text-xs text-muted-foreground">
                表单与自动分配设置将在后续版本写入链接配置，当前创建后默认启用。
              </p>
            </section>

            <div className={styles.formActions}>
              <Link href="/dashboard/channels/links" className={styles.btnOutline}>
                取消
              </Link>
              <button type="button" className={styles.btnPrimary} onClick={() => void handleSave()} disabled={saving}>
                {saving ? "创建中..." : "创建并生成"}
              </button>
            </div>
          </div>

          <div>
            <section className={styles.formCard}>
              <h3 className={styles.formCardTitle}>链接预览</h3>
              <div className={styles.previewUrl}>
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <Link2 size={14} className="shrink-0 text-primary" />
                  {previewUrl}
                </span>
                <button
                  type="button"
                  className={styles.btnLink}
                  onClick={copyUrl}
                  disabled={!createdLinkUrl}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <div className={styles.qrPreview}>
                {saving ? (
                  <Skeleton className="h-[180px] w-[180px] rounded-lg" />
                ) : (
                  <QrCode value={previewUrl} size={180} level="M" />
                )}
                <button type="button" className={`${styles.btnOutline} mt-4`} disabled={!createdLinkUrl}>
                  <Download size={14} />
                  下载二维码
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConsolePage>
  );
}
