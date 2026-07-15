import { Suspense } from "react";

import { QuickEntryWorkspace } from "@/components/sales/quick-entry-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function QuickEntryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuickEntryWorkspace />
    </Suspense>
  );
}
