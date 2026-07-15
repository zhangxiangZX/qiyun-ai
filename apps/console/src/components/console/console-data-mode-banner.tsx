"use client";

import { useEffect, useState } from "react";

import { Badge } from "@qiyun/ui";

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
    <div
      className={`flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-control border px-3 py-2 text-xs ${
        presentation.variant === "success"
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
          : "border-amber-200 bg-amber-50/70 text-amber-800"
      }`}
      role="status"
    >
      <strong className="font-semibold">{presentation.title}</strong>
      <span className="opacity-80">{presentation.body}</span>
    </div>
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
