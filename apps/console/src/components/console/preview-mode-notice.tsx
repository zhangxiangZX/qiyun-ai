"use client";

import { Info } from "lucide-react";

import { Alert } from "@qiyun/ui";

import {
  getFeatureDataModeHint,
  type ConsoleDataMode,
} from "@/lib/console/data-mode-hints";
import { getPreviewNoticeTitle } from "@/lib/console/mode-copy";

export function PreviewModeNotice({
  message,
  title,
  feature,
  mode = "preview",
}: {
  message: string;
  title?: string;
  feature?: string;
  mode?: ConsoleDataMode;
}) {
  const resolvedMessage =
    message ||
    (feature ? getFeatureDataModeHint(feature, mode) : "") ||
    getFeatureDataModeHint("概览", mode);

  if (!resolvedMessage) {
    return null;
  }

  const resolvedTitle = title ?? getPreviewNoticeTitle(mode);

  return (
    <Alert variant="info" title={resolvedTitle}>
      <div className="flex items-start gap-2 text-sm leading-relaxed">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p>{resolvedMessage}</p>
      </div>
    </Alert>
  );
}
