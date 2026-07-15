import { Suspense } from "react";

import { CustomerOpsWorkspace } from "@/components/sales/customer-ops-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function CustomerOpsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerOpsWorkspace />
    </Suspense>
  );
}
