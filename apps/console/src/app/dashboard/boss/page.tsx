import { Suspense } from "react";

import { BossDashboardWorkspace } from "@/components/dashboard/boss-dashboard-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function BossPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BossDashboardWorkspace />
    </Suspense>
  );
}
