"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Circle, Loader2, Send, X } from "lucide-react";

import { Alert, Button, Input, Label } from "@qiyun/ui";

import { resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { PreviewModeNotice } from "@/components/console/preview-mode-notice";
import { getFeatureDataModeHint } from "@/lib/console/data-mode-hints";
import { getSiteTestSuccessMessage } from "@/lib/console/mode-copy";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import {
  resolveWidgetValidationChecks,
  type WidgetValidationCheck,
} from "@/lib/sites/install-flow";
import type { TestMessageResult } from "@/lib/sites/types";

type CheckStatus = WidgetValidationCheck["status"];

export interface WidgetIntegrationPanelProps {
  embedSnippet: string | null;
  savedDomains: string[];
  dirty: boolean;
  previewMode: boolean;
  simulationHint?: string;
  onTest: (origin: string, message: string) => Promise<TestMessageResult>;
}

export function WidgetIntegrationPanel({
  embedSnippet,
  savedDomains,
  dirty,
  previewMode,
  simulationHint,
  onTest,
}: WidgetIntegrationPanelProps) {
  const [scriptConfirmed, setScriptConfirmed] = useState(false);
  const [origin, setOrigin] = useState(savedDomains[0] ?? "");
  const [message, setMessage] = useState("你好，我想测试一下 Widget 是否已正确接入。");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestMessageResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(savedDomains[0] ?? "");
    setTestResult(null);
    setTestError(null);
  }, [savedDomains]);

  const checks = useMemo(
    () =>
      resolveWidgetValidationChecks({
        embedSnippet,
        savedDomains,
        dirty,
        origin,
        scriptConfirmed,
        testLoading,
        testResult,
        testError,
      }),
    [dirty, embedSnippet, origin, savedDomains, scriptConfirmed, testError, testLoading, testResult],
  );

  async function handleSendTest() {
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const response = await onTest(origin, message);
      setTestResult(response);
    } catch (error) {
      const presentation = resolveRequestErrorPresentation(error, "测试消息发送失败。");
      setTestError(presentation.message);
    } finally {
      setTestLoading(false);
    }
  }

  function renderStatusIcon(status: CheckStatus) {
    if (status === "running") {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />;
    }
    if (status === "pass") {
      return <Check className="h-5 w-5 text-success" aria-hidden />;
    }
    if (status === "fail") {
      return <X className="h-5 w-5 text-destructive" aria-hidden />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" aria-hidden />;
  }

  const allPassed = checks.every((check) => check.status === "pass");

  return (
    <section id="widget-integration-panel" className="rounded-card border border-border bg-card p-6 shadow-card ui-hover-lift animate-scale-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Widget 接入校验</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            依次确认脚本、白名单和测试消息，三项全部通过即可视为接入完成。
          </p>
        </div>
        {allPassed ? (
          <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
            验收通过
          </span>
        ) : null}
      </div>

      {previewMode ? (
        <div className="mt-4">
          <PreviewModeNotice
            message={simulationHint ?? getFeatureDataModeHint("站点", "preview")}
            feature="站点"
          />
        </div>
      ) : simulationHint ? (
        <Alert variant="info" title="测试说明" className="mt-4">
          {simulationHint}
        </Alert>
      ) : null}

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { step: "1", title: "复制脚本", hint: "在向导第 1 步复制嵌入代码" },
          { step: "2", title: "校验域名", hint: "白名单保存后选择已授权 Origin" },
          { step: "3", title: "发送测试", hint: "确认 Widget 能正常回复" },
        ].map((item) => (
          <li
            key={item.step}
            className="rounded-control border border-border/70 bg-background/50 px-3 py-3 text-sm"
          >
            <span className="text-xs font-semibold text-primary">步骤 {item.step}</span>
            <p className="mt-1 font-medium text-card-foreground">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
          </li>
        ))}
      </ol>

      <ul className="mt-5 space-y-3">
        {checks.map((check) => (
          <li
            key={check.id}
            className="flex gap-3 rounded-control border border-border/70 bg-background/40 p-4 transition-all duration-300 hover:border-primary/25 hover:bg-primary/[0.03]"
          >
            <span className="mt-0.5 shrink-0">{renderStatusIcon(check.status)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-card-foreground">{check.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{check.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 space-y-4 rounded-control border border-border/70 bg-muted/20 p-4">
        <p className="text-sm font-medium text-card-foreground">发送测试消息</p>

        {savedDomains.length === 0 ? (
          <Alert variant="warning" title="还没有已保存的域名">
            请先在「域名白名单」卡片中保存至少一个域名，再发送测试消息。
          </Alert>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={scriptConfirmed}
            onChange={(event) => setScriptConfirmed(event.target.checked)}
            disabled={!embedSnippet}
          />
          <span className="text-muted-foreground">
            我已经在目标页面看到了 Widget，并确认是当前这次配置对应的脚本。
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="integration-origin">模拟访客 Origin</Label>
            <select
              id="integration-origin"
              className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              disabled={testLoading}
            >
              {savedDomains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
              <option value="blocked.example.com">blocked.example.com（未授权）</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="integration-message">测试消息</Label>
            <Input
              id="integration-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={testLoading}
            />
          </div>
        </div>

        <Button
          onClick={() => void handleSendTest()}
          loading={testLoading}
          disabled={!origin || savedDomains.length === 0}
          className="w-full sm:w-auto"
        >
          <Send className="h-4 w-4" aria-hidden />
          发送测试消息
        </Button>

        {testResult && !testResult.ok ? (
          <Alert variant="error" title={`测试失败（${testResult.code}）`}>
            {testResult.message}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => void handleSendTest()} disabled={testLoading}>
                重新发送测试
              </Button>
            </div>
          </Alert>
        ) : null}
        {testError ? (
          <Alert variant="error" title="测试请求失败">
            {testError}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => void handleSendTest()} disabled={testLoading}>
                重试
              </Button>
            </div>
          </Alert>
        ) : null}
        {testResult?.ok ? (
          <Alert variant="success" title="测试通过">
            {getSiteTestSuccessMessage(previewMode ? "preview" : "upstream")}
            {testResult.latencyMs ? ` 响应耗时 ${testResult.latencyMs}ms。` : null}
          </Alert>
        ) : null}
      </div>
    </section>
  );
}
