import { Suspense } from "react";

import { SalesRepDashboardWorkspace } from "@/components/dashboard/sales-rep-dashboard-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SalesRepPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesRepDashboardWorkspace />
    </Suspense>
  );
}
