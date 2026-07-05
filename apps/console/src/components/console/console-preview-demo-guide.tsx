"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Presentation } from "lucide-react";

import { Alert } from "@qiyun/ui";

import { fetchConsoleMode, type ConsoleModeInfo } from "@/lib/api/mode";
import { previewDemoScriptSteps } from "@/lib/demo-script";

export function ConsolePreviewDemoGuide() {
  const [mode, setMode] = useState<ConsoleModeInfo | null>(null);

  useEffect(() => {
    void fetchConsoleMode()
      .then(setMode)
      .catch(() => setMode(null));
  }, []);

  if (!mode || mode.mode !== "preview") {
    return null;
  }

  return (
    <Alert variant="info" title="演示脚本（Preview 模式）">
      <p className="text-sm leading-relaxed text-foreground/80">
        当前未连接 apps/api。可按下列顺序向客户演示控制台能力；横幅与只读提示会标明演示边界。
      </p>
      <ol className="mt-3 space-y-2">
        {previewDemoScriptSteps.map((step, index) => (
          <li key={step.id} className="flex gap-2 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info/10 text-xs font-semibold text-info">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <Link href={step.href} className="font-medium text-foreground hover:text-primary">
                {step.label}
              </Link>
              {step.note ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.note}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Presentation className="h-3.5 w-3.5 shrink-0" aria-hidden />
        配置 API_BASE_URL 后将自动隐藏本引导，并切换为真实 API 模式横幅。
      </p>
    </Alert>
  );
}
