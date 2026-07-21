"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  FileText,
  Save,
} from "lucide-react";
import { Skeleton, SuccessDialogToast } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { fetchAuthSession } from "@/lib/auth/client";
import { unwrapEnvelope } from "@/lib/api/envelope";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import {
  INDUSTRY_OPTIONS,
  REGION_CITIES,
  REGION_DISTRICTS,
  REGION_PROVINCES,
  SCALE_OPTIONS,
  mergeProfile,
  type EnterpriseProfileForm,
} from "@/lib/team/enterprise-profile-data";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/enterprise-profile-edit.module.css";

const UPLOAD_ITEMS = [
  { key: "logo", title: "Logo", hint: "建议 200×200px", file: "logo.png", uploaded: true, image: true },
  { key: "license", title: "营业执照", hint: "jpg/png/pdf，≤5MB", file: "business_license.pdf", uploaded: true, required: true },
  { key: "catalog", title: "产品说明书/手册", hint: "pdf/doc，≤10MB", file: "product_catalog.pdf", uploaded: true },
  { key: "cert", title: "认证资质", hint: "支持多文件打包", file: "certificates.zip", uploaded: true },
] as const;

function SectionCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>{number}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
  wide,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.formGridWide : ""}`}>
      <label className={styles.fieldLabel}>
        {label}
        {required ? <span className={styles.required}> *</span> : null}
      </label>
      {children}
    </div>
  );
}

export function EnterpriseProfileEditWorkspace() {
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [form, setForm] = useState<EnterpriseProfileForm>(mergeProfile(null));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      if (!session) return;
      const active = session.workspaces.find((w) => w.isActive);
      if (!active) return;
      setWorkspaceId(active.id);

      const res = await fetch(`/api/auth/workspaces/${active.id}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json().catch(() => null);
        const workspace = unwrapEnvelope<{ name?: string; companyProfile?: Record<string, unknown> }>(body);
        if (workspace) {
          setForm(mergeProfile(workspace.companyProfile, workspace.name));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  function updateField<K extends keyof EnterpriseProfileForm>(key: K, value: EnterpriseProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveError(null);
  }

  async function handleSave(publish: boolean) {
    if (!workspaceId) {
      setSaveError("未找到当前工作空间，无法保存。");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/auth/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body && typeof body === "object" && "message" in body
            ? String((body as { message?: string }).message)
            : "保存失败，请稍后重试。";
        throw new Error(message);
      }
      setSuccessOpen(true);
      if (publish) {
        // V1: publish is same as save
      }
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setSuccessOpen(true);
      } else {
        setSaveError(err instanceof Error ? err.message : "保存失败，请稍后重试。");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleLogoSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const companyInitial = form.companyName.trim().charAt(0) || "企";
  const cities = REGION_CITIES[form.city] ?? [];
  const districts = REGION_DISTRICTS[form.district] ?? REGION_DISTRICTS[cities[0]] ?? [];

  if (loading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="企业资料编辑" />
        </ConsolePageAlerts>
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="mt-4 h-96 w-full rounded-card" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="企业资料编辑" />
      </ConsolePageAlerts>

      <div className={styles.pageTitle}>
        <Link href="/dashboard/team/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          ← 返回企业资料
        </Link>
      </div>

      {saveError ? <div className={styles.notice}>{saveError}</div> : null}

      <section className={styles.summaryCard}>
        <div className={styles.summaryLeft}>
          <div className={styles.logoBox}>
            {logoPreview ? (
              <img src={logoPreview} alt="企业 Logo" className={styles.logoImg} />
            ) : (
              <span className={styles.logoPlaceholder}>{companyInitial}</span>
            )}
          </div>
          <div className={styles.summaryInfo}>
            <h2>{form.companyName}</h2>
            <div className={styles.summaryMeta}>
              <span>
                企业 ID：{workspaceId?.slice(0, 18).toUpperCase() ?? "—"}
                <button type="button" className={styles.copyBtn} aria-label="复制企业 ID">
                  <Copy size={12} /> 复制
                </button>
              </span>
              <span>当前套餐：企业高级版</span>
              <span>到期时间：2025-06-30</span>
            </div>
          </div>
        </div>
        <div className={styles.summaryRight}>
          <span className={styles.certBadge}>
            <BadgeCheck size={14} /> 已认证
          </span>
          <span className={styles.certSub}>认证有效期至 2026-01-15</span>
        </div>
      </section>

      <SectionCard number={1} title="基本信息">
        <div className={styles.formGrid}>
          <Field label="企业名称" required>
            <input
              className={styles.fieldInput}
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="请输入企业全称"
            />
          </Field>
          <Field label="简称" required>
            <input
              className={styles.fieldInput}
              value={form.shortName}
              onChange={(e) => updateField("shortName", e.target.value)}
              placeholder="请输入企业简称"
            />
          </Field>
          <Field label="所属行业" required>
            <select
              className={styles.fieldSelect}
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
            >
              {INDUSTRY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="企业规模" required>
            <select
              className={styles.fieldSelect}
              value={form.scale}
              onChange={(e) => updateField("scale", e.target.value)}
            >
              {SCALE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="官方网站">
            <input
              className={styles.fieldInput}
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="联系电话" required>
            <input
              className={styles.fieldInput}
              value={form.hotline}
              onChange={(e) => updateField("hotline", e.target.value)}
              placeholder="请输入联系电话"
            />
          </Field>
          <Field label="所在地区" required wide>
            <div className={styles.regionRow}>
              <select
                className={styles.fieldSelect}
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              >
                {REGION_PROVINCES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                className={styles.fieldSelect}
                value={form.district}
                onChange={(e) => updateField("district", e.target.value)}
              >
                {(cities.length ? cities : ["请选择"]).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                className={styles.fieldSelect}
                value={form.subDistrict}
                onChange={(e) => updateField("subDistrict", e.target.value)}
              >
                {(districts.length ? districts : ["请选择"]).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="详细地址" wide>
            <input
              className={styles.fieldInput}
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="请输入详细地址"
            />
          </Field>
          <Field label="企业邮箱" required>
            <input
              className={styles.fieldInput}
              type="email"
              value={form.supportEmail}
              onChange={(e) => updateField("supportEmail", e.target.value)}
              placeholder="请输入企业邮箱"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard number={2} title="联系与销售资料">
        <div className={styles.formGrid}>
          <Field label="销售联系人" required>
            <input
              className={styles.fieldInput}
              value={form.salesContact}
              onChange={(e) => updateField("salesContact", e.target.value)}
            />
          </Field>
          <Field label="售后联系人" required>
            <input
              className={styles.fieldInput}
              value={form.afterSalesContact}
              onChange={(e) => updateField("afterSalesContact", e.target.value)}
            />
          </Field>
          <Field label="微信/企微">
            <input
              className={styles.fieldInput}
              value={form.wechat}
              onChange={(e) => updateField("wechat", e.target.value)}
              placeholder="请输入微信号或企微"
            />
          </Field>
          <Field label="展会/展厅地址">
            <input
              className={styles.fieldInput}
              value={form.exhibitionAddress}
              onChange={(e) => updateField("exhibitionAddress", e.target.value)}
              placeholder="请输入展会或展厅地址"
            />
          </Field>
          <Field label="主营业务/业务方向" required wide>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.fieldTextarea}
                value={form.businessDirection}
                onChange={(e) => updateField("businessDirection", e.target.value)}
                maxLength={200}
                rows={3}
              />
              <span className={styles.charCount}>
                {form.businessDirection.length}/200
              </span>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard number={3} title="资质与品牌">
        <div className={styles.uploadGrid}>
          {UPLOAD_ITEMS.map((item) => (
            <div key={item.key} className={styles.uploadCard}>
              <h3 className={styles.uploadCardTitle}>
                {item.title}
                {"required" in item && item.required ? <span className={styles.required}> *</span> : null}
              </h3>
              <div className={styles.uploadPreview}>
                {"image" in item && item.image && logoPreview ? (
                  <img src={logoPreview} alt={item.title} />
                ) : "image" in item && item.image ? (
                  <span className={styles.logoPlaceholder}>{companyInitial}</span>
                ) : (
                  <FileText size={28} className={styles.uploadPreviewIcon} />
                )}
              </div>
              <p className={styles.uploadHint}>{item.hint}</p>
              <p className={styles.uploadFileName}>{item.file}</p>
              {item.uploaded ? (
                <span className={styles.uploadStatus}>
                  <CheckCircle2 size={12} /> 已上传
                </span>
              ) : null}
              <div className={styles.uploadActions}>
                {"image" in item && item.image ? (
                  <label className={styles.uploadAction}>
                    更换
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleLogoSelect(e.target.files)}
                    />
                  </label>
                ) : (
                  <button type="button" className={styles.uploadAction}>
                    更换
                  </button>
                )}
                <button type="button" className={`${styles.uploadAction} ${styles.uploadActionDanger}`}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className={styles.v1Hint}>V1 附件上传仅本地预览，不会同步到后端。</p>
      </SectionCard>

      <SectionCard number={4} title="对外展示信息">
        <div className={styles.formGrid}>
          {(
            [
              ["publicIntro", "企业简介", 200],
              ["coreAdvantages", "核心优势", 200],
              ["mainProducts", "主营产品", 200],
              ["serviceArea", "服务区域", 100],
              ["defaultMessage", "默认欢迎语", 100],
            ] as const
          ).map(([key, label, max]) => (
            <Field key={key} label={label} required wide>
              <div className={styles.textareaWrap}>
                <textarea
                  className={styles.fieldTextarea}
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  maxLength={max}
                  rows={3}
                />
                <span className={styles.charCount}>
                  {form[key].length}/{max}
                </span>
              </div>
            </Field>
          ))}
        </div>
      </SectionCard>

      <div className={styles.footerBar}>
        <Link href="/dashboard/team/profile" className={styles.btnGhost}>
          取消
        </Link>
        <button
          type="button"
          className={styles.btnOutline}
          disabled={saving}
          onClick={() => void handleSave(false)}
        >
          保存草稿
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={saving}
          onClick={() => void handleSave(true)}
        >
          <Save size={14} />
          {saving ? "保存中…" : "保存并发布"}
        </button>
      </div>

      <SuccessDialogToast
        open={successOpen}
        title="保存成功"
        message="企业资料已成功更新，修改即时生效。"
        confirmLabel="我知道了"
        onClose={() => setSuccessOpen(false)}
      />
    </ConsolePage>
  );
}
