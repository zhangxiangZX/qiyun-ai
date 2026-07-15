import { Suspense } from "react";

import { RepurchaseRemindersWorkspace } from "@/components/sales/repurchase-reminders-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function RepurchasePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RepurchaseRemindersWorkspace />
    </Suspense>
  );
}
