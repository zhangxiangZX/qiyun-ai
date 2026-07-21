"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Skeleton } from "@qiyun/ui";

import { getApiErrorMessage } from "@/lib/api/errors";
import { createBot } from "@/lib/bots/data";

/**
 * 新建助手入口：调用上游创建接口后跳转到配置页。
 * （历史实现只是重定向到已有助手，导致「新建」无效并常落到不存在的 bot-support。）
 */
export default function BotConfigEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void createBot("未命名助手")
      .then((bot) => {
        if (!cancelled) {
          router.replace(`/dashboard/bots/${bot.id}/basics`);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "创建助手失败，请稍后重试。"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="space-y-4 py-8">
        <Alert variant="error" title="新建助手失败">
          {error}
        </Alert>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => router.push("/dashboard/bots")}
        >
          返回助手列表
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="h-96 w-full rounded-card" />
      <p className="mt-3 text-sm text-muted-foreground">正在创建助手…</p>
    </div>
  );
}
