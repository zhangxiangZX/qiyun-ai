"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  Plus,
  Save,
  Star,
  X,
} from "lucide-react";
import { Badge, Button, Input, Label, Select, SuccessDialogToast } from "@qiyun/ui";

import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  createQuoteTemplate,
  getQuoteTemplate,
  updateQuoteTemplate,
} from "@/lib/quotes/api";
import { mockQuoteTemplates } from "@/lib/quotes/template-mock-data";
import {
  TEMPLATE_FIELD_OPTIONS,
  THEME_COLOR_PRESETS,
  type QuoteTemplate,
  type QuoteTemplateConfig,
  type TemplateLogoPosition,
} from "@/lib/quotes/template-types";
import { QuoteHtmlPreview } from "./quote-html-preview";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-foreground"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TemplateEditWorkspace({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(templateId);
  const [loading, setLoading] = useState(isEdit);
  const [usingMock, setUsingMock] = useState(false);
  const seed = useMemo<QuoteTemplate | undefined>(
    () => (templateId ? mockQuoteTemplates.find((t) => t.id === templateId) : undefined),
    [templateId],
  );

  const [form, setForm] = useState<QuoteTemplateConfig>(() => ({
    templateName: seed?.templateName ?? "",
    themeColor: seed?.themeColor ?? "#1677ff",
    logoPosition: seed?.logoPosition ?? "left",
    showCompanyInfo: seed?.showCompanyInfo ?? true,
    showCustomerInfo: seed?.showCustomerInfo ?? true,
    fields: seed?.fields ?? ["产品名称", "规格型号", "数量", "单价", "金额"],
    terms: seed?.terms ?? {
      payment: "合同签订后支付 30% 预付款，发货前支付 70%。",
      delivery: "合同生效后 30 个工作日内交付。",
      validity: "本报价有效期 30 天。",
    },
  }));
  const [companyName, setCompanyName] = useState(seed?.companyName ?? "企云科技");
  const [description, setDescription] = useState(seed?.description ?? "");

  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    void (async () => {
      setLoading(true);
      try {
        const mode = await fetchConsoleMode().catch(() => null);
        if (mode && isPreviewMode(mode)) {
          if (seed) {
            setForm({
              templateName: seed.templateName,
              themeColor: seed.themeColor,
              logoPosition: seed.logoPosition,
              showCompanyInfo: seed.showCompanyInfo,
              showCustomerInfo: seed.showCustomerInfo,
              fields: seed.fields,
              terms: seed.terms,
            });
            setCompanyName(seed.companyName);
            setDescription(seed.description);
          }
          setUsingMock(true);
          return;
        }
        const tpl = await getQuoteTemplate(templateId);
        setForm({
          templateName: tpl.templateName,
          themeColor: tpl.themeColor,
          logoPosition: tpl.logoPosition,
          showCompanyInfo: tpl.showCompanyInfo,
          showCustomerInfo: tpl.showCustomerInfo,
          fields: tpl.fields,
          terms: tpl.terms,
        });
        setCompanyName(tpl.companyName);
        setDescription(tpl.description);
        setUsingMock(false);
      } catch {
        if (seed) {
          setUsingMock(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [seed, templateId]);

  const setField = <K extends keyof QuoteTemplateConfig>(key: K, value: QuoteTemplateConfig[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleField = (f: string) =>
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.includes(f) ? prev.fields.filter((x) => x !== f) : [...prev.fields, f],
    }));

  const save = async () => {
    if (!form.templateName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        companyName,
        description,
      };
      if (usingMock) {
        await new Promise((r) => setTimeout(r, 400));
      } else if (isEdit && templateId) {
        await updateQuoteTemplate(templateId, payload);
      } else {
        const created = await createQuoteTemplate(payload);
        router.push(`/dashboard/quotes/templates/${created.id}`);
      }
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature={isEdit ? "编辑报价模板" : "新建报价模板"} />
        </ConsolePageAlerts>
        <p className="text-sm text-muted-foreground">加载模板中…</p>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature={isEdit ? "编辑报价模板" : "新建报价模板"} />
      </ConsolePageAlerts>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/quotes/templates"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={12} /> 报价模板 / {isEdit ? "编辑模板" : "新建模板"}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {isEdit ? "编辑报价模板" : "新建报价模板"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {templateId ? (
            <Link href={`/dashboard/quotes/templates/${templateId}/preview`}>
              <Button variant="outline" leftIcon={<Eye size={16} />}>
                预览
              </Button>
            </Link>
          ) : null}
          <Button onClick={save} loading={saving} leftIcon={<Save size={16} />}>
            保存模板
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* 左：配置表单 */}
        <div className="space-y-6">
          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-foreground">基础设置</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="模板名称" required>
                <Input
                  value={form.templateName}
                  onChange={(e) => setField("templateName", e.target.value)}
                  placeholder="例如：标准设备报价模板"
                />
              </Field>
              <Field label="公司名称">
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="用于页眉显示" />
              </Field>
            </div>
            <Field label="模板说明" className="mt-4">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话描述模板适用场景"
              />
            </Field>
          </section>

          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-foreground">外观设置</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="主题色">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.themeColor}
                    onChange={(e) => setField("themeColor", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-border bg-card"
                    aria-label="主题色取色器"
                  />
                  <Input
                    value={form.themeColor}
                    onChange={(e) => setField("themeColor", e.target.value)}
                    className="w-28"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {THEME_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setField("themeColor", c)}
                      className={`h-6 w-6 rounded-full border-2 ${form.themeColor === c ? "border-foreground" : "border-transparent"}`}
                      style={{ background: c }}
                      aria-label={`选择主题色 ${c}`}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Logo 位置">
                <Select
                  value={form.logoPosition}
                  onChange={(e) => setField("logoPosition", e.target.value as TemplateLogoPosition)}
                >
                  <option value="left">左侧</option>
                  <option value="center">居中</option>
                  <option value="right">右侧</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <Toggle
                checked={form.showCompanyInfo}
                onChange={(v) => setField("showCompanyInfo", v)}
                label="显示我方信息"
              />
              <Toggle
                checked={form.showCustomerInfo}
                onChange={(v) => setField("showCustomerInfo", v)}
                label="显示客户信息"
              />
            </div>
          </section>

          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="mb-1 text-sm font-semibold text-foreground">明细字段</h2>
            <p className="mb-3 text-xs text-muted-foreground">勾选需要在报价单明细表中展示的列，顺序即展示顺序。</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_FIELD_OPTIONS.map((f) => {
                const active = form.fields.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleField(f)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {active ? <Check size={13} /> : <Plus size={13} />}
                    {f}
                  </button>
                );
              })}
            </div>
            {form.fields.length === 0 ? (
              <p className="mt-2 text-xs text-destructive">请至少选择一个明细字段。</p>
            ) : null}
          </section>

          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-foreground">报价条款</h2>
            <div className="space-y-3">
              <Field label="有效期条款">
                <textarea
                  value={form.terms.validity}
                  onChange={(e) => setField("terms", { ...form.terms, validity: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label="付款方式">
                <textarea
                  value={form.terms.payment}
                  onChange={(e) => setField("terms", { ...form.terms, payment: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label="交付周期">
                <textarea
                  value={form.terms.delivery}
                  onChange={(e) => setField("terms", { ...form.terms, delivery: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* 右：实时预览 */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-card border border-border bg-slate-100 p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">实时预览</span>
              <Badge variant="outline" className="gap-1">
                <Eye size={11} /> HTML 渲染
              </Badge>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded bg-slate-200/40 p-3">
              <QuoteHtmlPreview config={form} />
            </div>
          </div>
        </div>
      </div>

      <SuccessDialogToast
        open={showToast}
        onClose={() => setShowToast(false)}
        title={isEdit ? "模板已更新" : "模板已创建"}
        message={form.templateName ? `「${form.templateName}」已在报价模板列表中。` : "可在「报价模板」列表中查看并套用。"}
      />
    </ConsolePage>
  );
}
