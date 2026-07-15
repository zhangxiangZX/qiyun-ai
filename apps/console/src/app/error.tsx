"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@qiyun/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 路由级渲染异常：上报到监控（如有），当前仅控制台留痕
    console.error("[console] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="这个页面加载出错了"
        description="页面在渲染时遇到了意外问题。你可以重试一次，或前往其他功能继续使用。"
        actionLabel="重试"
        onAction={reset}
      />
    </div>
  );
}
