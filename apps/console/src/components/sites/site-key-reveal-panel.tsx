"use client";

import { useState } from "react";
import { Check, Copy, EyeOff } from "lucide-react";

import { Alert, Button } from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface SiteKeyRevealPanelProps {
  siteKey: string;
  embedSnippet: string;
  previewMode?: boolean;
  onDismiss: () => void;
}

export function SiteKeyRevealPanel({
  siteKey,
  embedSnippet,
  previewMode = false,
  onDismiss,
}: SiteKeyRevealPanelProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  async function copyText(text: string, kind: "key" | "embed") {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "key") {
        setCopiedKey(true);
        window.setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedEmbed(true);
        window.setTimeout(() => setCopiedEmbed(false), 2000);
      }
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <section className="rounded-card border-2 border-warning/40 bg-warning/5 p-6 shadow-card">
      <Alert variant="warning" title={t(defaultLocale, "sites.key.revealTitle")}>
        {t(defaultLocale, "sites.key.revealDescription")}
      </Alert>

      {previewMode ? (
        <Alert variant="info" title={t(defaultLocale, "mode.notice.previewTitle")} className="mt-3">
          {t(defaultLocale, "sites.mode.keyRevealPreviewHint")}
        </Alert>
      ) : null}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          完整 siteKey（仅此一次）
        </p>
        <pre className="overflow-x-auto rounded-control border border-border bg-background p-3 font-mono text-xs text-foreground">
          {siteKey}
        </pre>
        <Button variant="outline" size="sm" onClick={() => void copyText(siteKey, "key")}>
          {copiedKey ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copiedKey ? "已复制密钥" : "复制 siteKey"}
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          更新后的嵌入代码
        </p>
        <pre className="overflow-x-auto rounded-control border border-border bg-muted/40 p-3 text-xs text-card-foreground">
          {embedSnippet}
        </pre>
        <Button variant="outline" size="sm" onClick={() => void copyText(embedSnippet, "embed")}>
          {copiedEmbed ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copiedEmbed ? t(defaultLocale, "sites.embed.copied") : t(defaultLocale, "sites.embed.copy")}
        </Button>
      </div>

      <Button className="mt-4" variant="secondary" onClick={onDismiss}>
        <EyeOff className="h-4 w-4" aria-hidden />
        {t(defaultLocale, "sites.key.revealDismiss")}
      </Button>
    </section>
  );
}
