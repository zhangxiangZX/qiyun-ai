import { Suspense } from "react";

import { BusinessRulesWorkspace } from "@/components/sales/business-rules-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function BusinessRulesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BusinessRulesWorkspace />
    </Suspense>
  );
}
