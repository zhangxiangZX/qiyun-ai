"use client";

import { useEffect, useState } from "react";

import { Alert, Badge } from "@qiyun/ui";

import { fetchConsoleMode, type ConsoleModeInfo } from "@/lib/api/mode";
import {
  getDataModeBannerPresentation,
  getModeBadgeLabel,
} from "@/lib/console/mode-copy";

export interface ConsoleDataModeBannerProps {
  feature?: string;
}

export function ConsoleDataModeBanner({ feature }: ConsoleDataModeBannerProps) {
  const [info, setInfo] = useState<ConsoleModeInfo | null>(null);

  useEffect(() => {
    void fetchConsoleMode()
      .then(setInfo)
      .catch(() => {
        setInfo({
          mode: "preview",
          upstreamConfigured: false,
          message: "无法解析 Console 数据模式。",
        });
      });
  }, []);

  if (!info) return null;

  const presentation = getDataModeBannerPresentation(
    info.mode,
    feature,
    info.message || undefined,
  );

  return (
    <Alert variant={presentation.variant} title={presentation.title}>
      {presentation.body}
    </Alert>
  );
}

export function ConsoleModeBadge() {
  const [info, setInfo] = useState<ConsoleModeInfo | null>(null);

  useEffect(() => {
    void fetchConsoleMode()
      .then(setInfo)
      .catch(() => {
        setInfo({
          mode: "preview",
          upstreamConfigured: false,
          message: "",
        });
      });
  }, []);

  if (!info) return null;

  const label = getModeBadgeLabel(info.mode);

  if (info.mode === "upstream") {
    return (
      <Badge variant="success" className="shrink-0">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="shrink-0">
      {label}
    </Badge>
  );
}
