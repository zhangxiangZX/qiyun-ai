import { Suspense } from "react";

import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function BotInsightsReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsWorkspace />
    </Suspense>
  );
}
