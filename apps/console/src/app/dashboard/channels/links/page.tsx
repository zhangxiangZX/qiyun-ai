import { Suspense } from "react";

import { SalesAcquisitionHub } from "@/components/channels/sales-acquisition-hub";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SalesLinksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesAcquisitionHub />
    </Suspense>
  );
}
