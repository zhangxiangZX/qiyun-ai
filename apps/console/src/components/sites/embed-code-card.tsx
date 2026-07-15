"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Alert, Button, QrCode } from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface EmbedCodeCardProps {
  embedSnippet: string | null;
}

export function EmbedCodeCard({ embedSnippet }: EmbedCodeCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!embedSnippet) {
      return;
    }
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-card-foreground">
        {t(defaultLocale, "sites.embed.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(defaultLocale, "sites.embed.description")}
      </p>
      {embedSnippet ? (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-control border border-border bg-muted/40 p-4 text-xs text-card-foreground">
            {embedSnippet}
          </pre>
          <div className="flex shrink-0 flex-col items-center gap-2 rounded-control border border-border bg-card p-3">
            <QrCode value={embedSnippet} size={132} title={t(defaultLocale, "sites.embed.qrTitle")} />
            <span className="text-xs text-muted-foreground">{t(defaultLocale, "sites.embed.qrHint")}</span>
          </div>
        </div>
      ) : null}
      {embedSnippet ? (
        <Button variant="outline" className="mt-4" onClick={() => void handleCopy()}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? t(defaultLocale, "sites.embed.copied") : t(defaultLocale, "sites.embed.copy")}
        </Button>
      ) : (
        <Alert variant="info" title="嵌入代码已受保护" className="mt-4">
          完整嵌入代码只会在创建或轮换 siteKey 后显示一次。请先执行密钥轮换，再复制最新 snippet。
        </Alert>
      )}
    </section>
  );
}
