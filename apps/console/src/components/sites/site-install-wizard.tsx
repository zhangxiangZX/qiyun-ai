"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";

import { Alert, Button } from "@qiyun/ui";

import { PreviewModeNotice } from "@/components/console/preview-mode-notice";
import { getFeatureDataModeHint } from "@/lib/console/data-mode-hints";
import {
  COMMON_SITE_INSTALL_ERRORS,
  resolveDomainChecklist,
  SITE_INSTALL_STEPS,
  type SiteInstallStepId,
} from "@/lib/sites/install-flow";
import { isValidDomain } from "@/lib/sites/validation";

export interface SiteInstallWizardProps {
  embedSnippet: string | null;
  savedDomains: string[];
  draftDomains: string[];
  dirty: boolean;
  previewMode: boolean;
  onCopyEmbed?: () => void;
}

export function SiteInstallWizard({
  embedSnippet,
  savedDomains,
  draftDomains,
  dirty,
  previewMode,
  onCopyEmbed,
}: SiteInstallWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [scriptDeployed, setScriptDeployed] = useState(false);

  const { items: domainChecklist, invalidDomains } = useMemo(
    () => resolveDomainChecklist({ savedDomains, draftDomains, dirty }),
    [draftDomains, dirty, savedDomains],
  );
  const activeDomains = draftDomains.length ? draftDomains : savedDomains;
  const currentStep = SITE_INSTALL_STEPS[stepIndex];

  async function handleCopy() {
    if (!embedSnippet) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      onCopyEmbed?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError("无法写入剪贴板，请手动选中上方代码复制，或检查浏览器权限。");
    }
  }

  function renderStepContent(stepId: SiteInstallStepId) {
    switch (stepId) {
      case "embed":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              把下面这段脚本放到官网页面的
              <code className="mx-1 font-mono text-xs">&lt;/body&gt;</code>
              之前。轮换 siteKey 后请重新复制一次，确保线上不是旧脚本。
            </p>
            {embedSnippet ? (
              <>
                <pre className="overflow-x-auto rounded-control border border-border bg-muted/40 p-4 text-xs text-card-foreground">
                  {embedSnippet}
                </pre>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handleCopy()}>
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? "已复制" : "复制嵌入脚本"}
                </Button>
                {copyError ? (
                  <Alert variant="error" title="复制失败">
                    {copyError}
                  </Alert>
                ) : null}
              </>
            ) : (
              <Alert variant="info" title="嵌入代码受保护">
                完整脚本只会在创建或轮换 siteKey 后展示一次。若当前未显示，请先轮换密钥。
              </Alert>
            )}
          </div>
        );
      case "domains":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              只有白名单中的域名才能加载 Widget 并访问公共聊天接口。请在右侧“域名白名单”卡片中完成保存。
            </p>
            <ul className="space-y-2">
              {domainChecklist.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-center gap-2 rounded-control border px-3 py-2 text-sm ${
                    item.done ? "border-success/40 bg-success/5" : "border-border bg-background/60"
                  }`}
                >
                  {item.done ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
            {activeDomains.length ? (
              <ul className="space-y-1 text-sm">
                {activeDomains.map((domain) => (
                  <li key={domain} className="font-mono text-card-foreground">
                    {domain}
                    {!isValidDomain(domain) ? (
                      <span className="ml-2 text-destructive">格式无效</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Alert variant="warning" title="还没有域名">
                请至少保存一个站点域名，例如
                <code className="mx-1 font-mono text-xs">www.example.com</code>。
              </Alert>
            )}
            {dirty ? (
              <Alert variant="warning" title="存在未保存变更">
                当前白名单修改还没有写入服务端，线上 Widget 仍会使用旧配置。
              </Alert>
            ) : null}
            {invalidDomains.length ? (
              <Alert variant="warning" title="白名单里有无效域名">
                请先修正无效域名，再继续安装验收。
              </Alert>
            ) : null}
          </div>
        );
      case "confirm":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              完成下面三项后，就可以进入“Widget 接入校验”面板做最终联调。
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-control border border-border bg-background/60 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={scriptDeployed}
                onChange={(event) => setScriptDeployed(event.target.checked)}
              />
              <span>
                <strong className="block text-card-foreground">已在官网部署脚本</strong>
                我已经把最新 snippet 放到目标页面，并刷新了缓存。
              </span>
            </label>
            <ul className="space-y-2">
              {[
                { label: "已有可复制的最新嵌入脚本", done: Boolean(embedSnippet) },
                { label: "域名白名单已保存且全部合法", done: domainChecklist.every((item) => item.done) },
                { label: "官网已确认 Widget 加载", done: scriptDeployed },
              ].map((item) => (
                <li
                  key={item.label}
                  className={`flex items-center gap-2 rounded-control border px-3 py-2 text-sm ${
                    item.done ? "border-success/40 bg-success/5" : "border-border"
                  }`}
                >
                  {item.done ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <a href="#widget-integration-panel">前往 Widget 接入校验</a>
            </Button>
          </div>
        );
      case "errors":
        return (
          <div className="space-y-4">
            {COMMON_SITE_INSTALL_ERRORS.map((entry) => (
              <div key={entry.title} className="rounded-control border border-border bg-background/40 p-4">
                <h3 className="text-sm font-semibold text-card-foreground">{entry.title}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {entry.causes.map((cause) => (
                    <li key={cause}>{cause}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card ui-hover-lift animate-scale-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">站点安装向导</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            帮你按顺序完成脚本复制、域名放行、安装确认和常见错误排查。
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          步骤 {stepIndex + 1} / {SITE_INSTALL_STEPS.length}
        </span>
      </div>

      {previewMode ? (
        <div className="mt-4">
          <PreviewModeNotice message={getFeatureDataModeHint("站点", "preview")} feature="站点" />
        </div>
      ) : null}

      <ol className="mt-5 flex flex-wrap gap-2">
        {SITE_INSTALL_STEPS.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                index === stepIndex
                  ? "bg-primary text-primary-foreground"
                  : index < stepIndex
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
              onClick={() => setStepIndex(index)}
            >
              {index + 1}. {step.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 min-h-[12rem]">{renderStepContent(currentStep.id)}</div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          上一步
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={stepIndex >= SITE_INSTALL_STEPS.length - 1}
          onClick={() => setStepIndex((current) => Math.min(SITE_INSTALL_STEPS.length - 1, current + 1))}
        >
          下一步
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
