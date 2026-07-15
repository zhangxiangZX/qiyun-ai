"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  ExternalLink,
  Globe,
  Link,
  Loader2,
  Monitor,
  Server,
} from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  CopyLinkContent,
  Input,
  Label,
  PageHeader,
  Select,
  Skeleton,
  SuccessDialogToast,
} from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { useApiResource, apiMutate, isPreviewModeError } from "@/lib/api/use-api-resource";
import {
  generateDnsRecords,
  generateEmbedSnippet,
  generatePreviewSiteKey,
  getAddSiteFormDefaults,
  listBotsForSiteSelect,
  type AddSiteFormDefaults,
  type DnsVerificationRecord,
} from "@/lib/sites/add-site-mock-data";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const BOTS_MOCK = listBotsForSiteSelect();
const FORM_DEFAULTS = getAddSiteFormDefaults();

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DNS Verification States                                                   */
/* -------------------------------------------------------------------------- */

type DnsVerifyState = "idle" | "verifying" | "success" | "error";

/* -------------------------------------------------------------------------- */
/*  Main Workspace                                                            */
/* -------------------------------------------------------------------------- */

export function AddSiteWorkspace() {
  const router = useRouter();

  /* ---- Data ---- */
  const { data: bots, loading: botsLoading } = useApiResource(
    "/bots",
    BOTS_MOCK,
  );

  /* ---- Form state ---- */
  const [form, setForm] = useState<AddSiteFormDefaults>(FORM_DEFAULTS);
  const [dnsDomain, setDnsDomain] = useState("");
  const [dnsVerifyState, setDnsVerifyState] = useState<DnsVerifyState>("idle");
  const [dnsRecords, setDnsRecords] = useState<DnsVerificationRecord[]>([]);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  /* ---- Submit state ---- */
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  /* ---- Derived state ---- */
  const previewSiteKey = generatePreviewSiteKey();
  const selectedBotId = form.botId || BOTS_MOCK[0]?.id || "";
  const embedSnippet = generateEmbedSnippet(selectedBotId, previewSiteKey);

  const canSubmit =
    form.siteName.trim().length > 0 &&
    form.siteDomain.trim().length > 0 &&
    form.botId.length > 0 &&
    !submitting;

  /* ---- Handlers ---- */
  const updateForm = useCallback(
    <K extends keyof AddSiteFormDefaults>(key: K, value: AddSiteFormDefaults[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setSubmitMessage(null);
      setSubmitError(null);
    },
    [],
  );

  const handleVerifyDns = useCallback(() => {
    const domain = dnsDomain.trim();
    if (!domain) {
      setDnsError("请输入自定义域名。");
      return;
    }

    setDnsVerifyState("verifying");
    setDnsError(null);
    setDnsRecords(generateDnsRecords(domain));

    // 模拟 1-2s 等待验证
    const delay = 1000 + Math.random() * 1000;
    window.setTimeout(() => {
      setDnsVerifyState("success");
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dnsDomain]);

  const handleCopyEmbed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setEmbedCopied(true);
      window.setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = embedSnippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setEmbedCopied(true);
      window.setTimeout(() => setEmbedCopied(false), 2000);
    }
  }, [embedSnippet]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    const body = {
      name: form.siteName.trim(),
      botId: form.botId,
      allowedDomains: [
        form.siteDomain.trim(),
        ...(dnsDomain.trim() && dnsVerifyState === "success" ? [dnsDomain.trim()] : []),
      ],
    };

    try {
      await apiMutate("/sites", "POST", body);

      setSubmitMessage("站点创建成功，即将跳转…");
      setShowSuccessToast(true);

      // 短暂延迟后跳转
      window.setTimeout(() => {
        router.push("/dashboard/sites");
      }, 1000);
    } catch (error: unknown) {
      if (isPreviewModeError(error)) {
        setSubmitError("当前为演示模式，站点创建操作未同步到后端。预览数据不会持久化。");
        setSubmitMessage("站点已在预览模式中创建（演示数据）。");
      } else {
        const message =
          error instanceof Error ? error.message : "站点创建失败，请稍后重试。";
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, dnsDomain, dnsVerifyState, router]);

  /* ---- Render ---- */

  if (botsLoading) {
    return (
      <ConsolePage>
        <div className="space-y-4">
          <Skeleton className="h-9 w-48 rounded-control" />
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      {/* Alerts */}
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="添加站点" />
      </ConsolePageAlerts>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => router.push("/dashboard/sites")}
        >
          <ArrowLeft size={13} />
          <span>渠道与站点</span>
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">添加站点</span>
      </div>

      {/* Page Header */}
      <PageHeader
        title="添加站点"
        description="配置新站点并绑定域名，将 AI 助手嵌入您的官网，开启智能获客。"
      />

      {/* Feedback Messages */}
      {submitMessage ? (
        <ConsoleFeedback
          variant="success"
          title={submitMessage}
          autoDismissMs={4000}
          onDismiss={() => setSubmitMessage(null)}
        />
      ) : null}
      {submitError ? (
        <ConsoleFeedback
          variant="error"
          title={submitError}
          autoDismissMs={0}
          onDismiss={() => setSubmitError(null)}
        />
      ) : null}

      {/* Main form grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column — form sections */}
        <div className="min-w-0 space-y-6">
          {/* 1. 站点基本信息 */}
          <SectionCard
            title="站点基本信息"
            description="填写站点名称与域名，选择关联的 AI 助手。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="站点名称" required>
                <Input
                  value={form.siteName}
                  onChange={(e) => updateForm("siteName", e.target.value)}
                  placeholder="例如：企业官网"
                />
              </FormField>

              <FormField label="站点域名" required hint="不含协议头，例如 your-company.com">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={form.siteDomain}
                    onChange={(e) => updateForm("siteDomain", e.target.value)}
                    placeholder="your-company.com"
                  />
                </div>
              </FormField>

              <FormField
                label="选择关联的 AI 助手"
                required
                hint="该助手将在此站点上响应访客对话"
              >
                <Select
                  value={form.botId}
                  onChange={(e) => updateForm("botId", e.target.value)}
                >
                  <option value="" disabled>
                    请选择 AI 助手…
                  </option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}
                      {bot.status === "draft" ? "（草稿）" : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </SectionCard>

          {/* 2. 绑定独立域名 */}
          <SectionCard
            title="绑定独立域名"
            description="为站点配置自定义域名，完成 DNS 验证后可启用自定义域名访问。"
          >
            <div className="space-y-4">
              {/* Domain input + verify button */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <FormField label="自定义域名" hint="例如 widget.your-company.com">
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={dnsDomain}
                        onChange={(e) => {
                          setDnsDomain(e.target.value);
                          if (dnsVerifyState !== "idle") {
                            setDnsVerifyState("idle");
                            setDnsRecords([]);
                            setDnsError(null);
                          }
                        }}
                        placeholder="widget.your-company.com"
                      />
                    </div>
                  </FormField>
                </div>

                <Button
                  onClick={handleVerifyDns}
                  disabled={!dnsDomain.trim() || dnsVerifyState === "verifying"}
                  loading={dnsVerifyState === "verifying"}
                  leftIcon={
                    dnsVerifyState === "verifying" ? undefined : (
                      <Server className="h-4 w-4" />
                    )
                  }
                >
                  {dnsVerifyState === "verifying" ? "验证中…" : "验证"}
                </Button>

                {dnsVerifyState === "success" ? (
                  <Badge variant="success" className="h-10 px-3 shrink-0">
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    验证成功
                  </Badge>
                ) : null}
              </div>

              {dnsError ? (
                <Alert variant="error">{dnsError}</Alert>
              ) : null}

              {/* DNS records */}
              {dnsRecords.length > 0 && dnsVerifyState !== "idle" ? (
                <div className="rounded-control border border-border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-card-foreground">
                      DNS 记录配置
                    </h3>
                    {dnsVerifyState === "verifying" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        等待验证…
                      </span>
                    ) : null}
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">
                    请前往您的域名 DNS 管理后台，添加以下记录。验证通常需要几分钟到几小时生效。
                  </p>

                  <div className="space-y-3">
                    {dnsRecords.map((record) => (
                      <div
                        key={`${record.type}-${record.name}`}
                        className="rounded-control border border-border bg-card p-3"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="secondary">{record.type}</Badge>
                          <span className="text-xs text-muted-foreground">{record.label}</span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {/* Record Name */}
                          <div>
                            <span className="mb-1 block text-[11px] font-medium uppercase text-muted-foreground">
                              记录名称
                            </span>
                            <CopyLinkContent
                              url={record.name}
                              copyLabel="复制"
                            />
                          </div>

                          {/* Record Value */}
                          <div>
                            <span className="mb-1 block text-[11px] font-medium uppercase text-muted-foreground">
                              记录值
                            </span>
                            <CopyLinkContent
                              url={record.value}
                              copyLabel="复制"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-control bg-info/10 border border-info/20 px-3 py-2 text-xs text-info">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      配置完成后请点击上方「验证」按钮确认 DNS 已生效。
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          {/* 3. Widget 安装代码预览 */}
          <SectionCard
            title="Widget 安装代码预览"
            description="站点创建成功后，将此代码段嵌入您网站的 HTML 中即可激活 AI 助手。"
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                将以下代码复制并粘贴到您网站的{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                  &lt;/body&gt;
                </code>{" "}
                标签之前。
              </p>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => void handleCopyEmbed()}
                  className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-control border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {embedCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {embedCopied ? "已复制" : "复制代码"}
                </button>
                <pre className="overflow-x-auto rounded-control bg-muted/60 p-4 pt-12 font-mono text-[12px] leading-relaxed text-foreground">
                  <code>{embedSnippet}</code>
                </pre>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right column — summary / actions */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Summary card */}
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground">配置摘要</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">站点名称</span>
                <span className="font-medium text-card-foreground">
                  {form.siteName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">站点域名</span>
                <span className="font-medium text-card-foreground font-mono text-xs">
                  {form.siteDomain || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI 助手</span>
                <span className="font-medium text-card-foreground">
                  {bots.find((b) => b.id === form.botId)?.name || "未选择"}
                </span>
              </div>
              {dnsDomain.trim() ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">自定义域名</span>
                  <span className="font-medium text-card-foreground font-mono text-xs">
                    {dnsDomain}
                  </span>
                </div>
              ) : null}
              {dnsVerifyState === "success" ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">DNS 验证</span>
                  <Badge variant="success">已验证</Badge>
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-2">
              <Button
                className="w-full"
                disabled={!canSubmit}
                loading={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "创建中…" : "创建站点"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/sites")}
                disabled={submitting}
              >
                取消
              </Button>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              创建后可在站点管理页面配置域名白名单与 Widget 外观
            </p>
          </div>

          {/* Quick tips */}
          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              操作提示
            </h3>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  1
                </span>
                <span>站点域名应为不含协议的裸域名，例如 your-company.com</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  2
                </span>
                <span>一个 AI 助手可关联多个站点，在站点管理页统一配置</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  3
                </span>
                <span>自定义域名为可选步骤，不影响 Widget 在已配置域名的运行</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  4
                </span>
                <span>安装代码中的 siteKey 创建后即生成，请妥善保管</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Success toast */}
      <SuccessDialogToast
        open={showSuccessToast}
        title="站点创建成功"
        message={
          submitError
            ? "站点已在预览模式中创建。即将跳转到站点管理页面。"
            : "新站点已成功创建，即将跳转到站点管理页面。"
        }
        confirmLabel="我知道了"
        onClose={() => {
          setShowSuccessToast(false);
          router.push("/dashboard/sites");
        }}
      />
    </ConsolePage>
  );
}
