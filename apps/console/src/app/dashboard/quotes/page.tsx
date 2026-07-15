import { Suspense } from "react";

import { QuotesManagementWorkspace } from "@/components/sales/quotes-management-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function QuotesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuotesManagementWorkspace />
    </Suspense>
  );
}
