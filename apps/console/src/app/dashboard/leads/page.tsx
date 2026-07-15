import { Suspense } from "react";

import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function LeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadsWorkspace />
    </Suspense>
  );
}
