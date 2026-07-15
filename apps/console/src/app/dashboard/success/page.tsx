import { Suspense } from "react";

import { SuccessPageWorkspace } from "@/components/shared/success-page-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SuccessPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SuccessPageWorkspace />
    </Suspense>
  );
}
