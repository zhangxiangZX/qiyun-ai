import { Suspense } from "react";

import { LostReasonsWorkspace } from "@/components/reports/lost-reasons-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function LostReasonsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LostReasonsWorkspace />
    </Suspense>
  );
}
