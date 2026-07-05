"use client";

import { useEffect, useState } from "react";

import { Alert } from "@qiyun/ui";

import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { getAnalyticsFootnote } from "@/lib/console/mode-copy";

export function AnalyticsDataFootnote({ feature }: { feature: "dashboard" | "reports" }) {
  const [preview, setPreview] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setPreview(isPreviewMode(info)))
      .catch(() => setPreview(true));
  }, []);

  if (preview === null) return null;

  const footnote = getAnalyticsFootnote(feature, preview ? "preview" : "upstream");

  return (
    <Alert variant={footnote.variant} title={footnote.title}>
      {footnote.body}
    </Alert>
  );
}
