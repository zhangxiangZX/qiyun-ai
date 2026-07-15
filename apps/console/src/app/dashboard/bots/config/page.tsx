"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@qiyun/ui";

import { listBots } from "@/lib/bots/data";

const FALLBACK_BOT_ID = "bot-support";

export default function BotConfigEntryPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void listBots()
      .then((bots) => {
        if (cancelled) return;
        const targetId = bots[0]?.id ?? FALLBACK_BOT_ID;
        router.replace(`/dashboard/bots/${targetId}/basics`);
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(`/dashboard/bots/${FALLBACK_BOT_ID}/basics`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="py-8">
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}
