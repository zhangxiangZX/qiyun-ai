import { Suspense } from "react";

import { SupplementTaskWorkspace } from "@/components/sales/supplement-task-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SupplementTaskPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SupplementTaskWorkspace />
    </Suspense>
  );
}
