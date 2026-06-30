import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export function DashboardEmptyAction() {
  return (
    <Button asChild className="inline-flex items-center gap-2">
      <Link href="/dashboard/bots">
        <Plus className="h-4 w-4" />
        {t(defaultLocale, "dashboard.empty.action")}
      </Link>
    </Button>
  );
}
