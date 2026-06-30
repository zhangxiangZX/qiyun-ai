"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Alert, Button, Input, Label } from "@qiyun/ui";

import type { TestMessageResult } from "@/lib/sites/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface TestMessageCardProps {
  allowedDomains: string[];
  savedDomains: string[];
  dirty?: boolean;
  onTest: (origin: string, message: string) => Promise<TestMessageResult>;
}

export function TestMessageCard({
  allowedDomains,
  savedDomains,
  dirty = false,
  onTest,
}: TestMessageCardProps) {
  const [origin, setOrigin] = useState(savedDomains[0] ?? "");
  const [message, setMessage] = useState("你好，我想测试一下 Widget");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestMessageResult | null>(null);

  async function handleSend() {
    setLoading(true);
    setResult(null);
    const response = await onTest(origin, message);
    setResult(response);
    setLoading(false);
  }

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-card-foreground">
        {t(defaultLocale, "sites.test.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(defaultLocale, "sites.test.description")}
      </p>

      {dirty ? (
        <Alert
          variant="warning"
          title="当前白名单有未保存变更，测试将使用已保存的域名配置。"
          className="mt-4"
        />
      ) : null}

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-origin">{t(defaultLocale, "sites.test.origin")}</Label>
          <select
            id="test-origin"
            className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            disabled={loading}
          >
            {allowedDomains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
            <option value="blocked.example.com">blocked.example.com（未授权）</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-message">{t(defaultLocale, "sites.test.message")}</Label>
          <Input
            id="test-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={loading}
          />
        </div>

        <Button onClick={() => void handleSend()} loading={loading}>
          <Send className="h-4 w-4" aria-hidden />
          {t(defaultLocale, "sites.test.send")}
        </Button>

        {result ? (
          result.ok ? (
            <Alert variant="success" title={result.reply}>
              响应耗时 {result.latencyMs}ms
            </Alert>
          ) : (
            <Alert variant="error" title={`错误 ${result.code}`}>
              {result.message}
            </Alert>
          )
        ) : null}
      </div>
    </section>
  );
}
