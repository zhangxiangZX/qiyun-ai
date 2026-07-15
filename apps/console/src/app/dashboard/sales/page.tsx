import { Suspense } from "react";

import { SalesFunnelWorkspace } from "@/components/sales/sales-funnel-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SalesDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesFunnelWorkspace />
    </Suspense>
  );
}
