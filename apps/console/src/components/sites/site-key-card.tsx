"use client";

import { useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";

import { Alert, Button, ConfirmDialog } from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface SiteKeyCardProps {
  siteKeyPrefix: string;
  rotating?: boolean;
  onRotate: () => void;
}

export function SiteKeyCard({ siteKeyPrefix, rotating = false, onRotate }: SiteKeyCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <KeyRound className="h-5 w-5" aria-hidden />
          {t(defaultLocale, "sites.key.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(defaultLocale, "sites.key.description")}
        </p>
        <p className="mt-4 font-mono text-sm text-foreground">{siteKeyPrefix}***</p>
        <Alert variant="info" title={t(defaultLocale, "sites.key.hint")} className="mt-4" />
        <Button
          variant="outline"
          className="mt-4"
          loading={rotating}
          onClick={() => setConfirmOpen(true)}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t(defaultLocale, "sites.key.rotate")}
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={t(defaultLocale, "sites.key.confirmTitle")}
        description={t(defaultLocale, "sites.key.confirmDescription")}
        confirmLabel={t(defaultLocale, "sites.key.rotate")}
        cancelLabel="取消"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onRotate();
        }}
      />
    </>
  );
}
