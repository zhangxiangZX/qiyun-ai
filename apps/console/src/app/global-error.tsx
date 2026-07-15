"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 全局崩溃（含 root layout）：唯一兜底，必须自身可渲染，不依赖任何外部 CSS
    console.error("[console] global error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          background: "#f6f8fc",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            padding: "40px 24px",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 16px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fef2f2",
              color: "#ef4444",
            }}
          >
            <AlertTriangle size={26} />
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
            应用出错了
          </h1>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#6b7280",
            }}
          >
            系统遇到了一个意外错误。请重试，或稍后返回。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              background: "#3b5eff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
