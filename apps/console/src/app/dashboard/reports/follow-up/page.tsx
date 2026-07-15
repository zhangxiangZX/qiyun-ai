import { Suspense } from "react";

import { FollowUpAnalyticsWorkspace } from "@/components/reports/follow-up-analytics-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function FollowUpAnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FollowUpAnalyticsWorkspace />
    </Suspense>
  );
}
