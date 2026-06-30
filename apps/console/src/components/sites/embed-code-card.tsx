"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface EmbedCodeCardProps {
  embedSnippet: string;
}

export function EmbedCodeCard({ embedSnippet }: EmbedCodeCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
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
      <pre className="mt-4 overflow-x-auto rounded-control border border-border bg-muted/40 p-4 text-xs text-card-foreground">
        {embedSnippet}
      </pre>
      <Button variant="outline" className="mt-4" onClick={() => void handleCopy()}>
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? t(defaultLocale, "sites.embed.copied") : t(defaultLocale, "sites.embed.copy")}
      </Button>
    </section>
  );
}
