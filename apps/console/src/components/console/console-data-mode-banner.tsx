"use client";

import { useEffect, useState } from "react";

import { Alert, Badge } from "@qiyun/ui";

import { fetchConsoleMode, type ConsoleModeInfo } from "@/lib/api/mode";

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
          message: "Unable to resolve console data mode.",
        });
      });
  }, []);

  if (!info || info.mode === "upstream") {
    return null;
  }

  const featureHint = feature ? `${feature}：` : "";

  return (
    <Alert variant="warning" title="Preview / 演示模式">
      {featureHint}未配置 API_BASE_URL（或 NEXT_PUBLIC_API_BASE_URL），当前页面使用前端演示数据，未连接
      apps/api。数据不会与真实后端同步，刷新后可能重置。
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

  if (info.mode === "upstream") {
    return (
      <Badge variant="success" className="shrink-0">
        真实 API
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="shrink-0">
      Preview / 演示
    </Badge>
  );
}
