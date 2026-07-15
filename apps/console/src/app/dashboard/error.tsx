"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@qiyun/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // dashboard 路由段渲染异常：上报到监控（如有），当前仅控制台留痕
    console.error("[console] dashboard route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="页面加载出错"
        description="该页面在渲染时遇到了问题。你可以重试，或通过左侧导航前往其他功能。"
        actionLabel="重试"
        onAction={reset}
      />
    </div>
  );
}
