import { Suspense } from "react";

import { SalesLinksWorkspace } from "@/components/channels/sales-links-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SalesLinksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesLinksWorkspace />
    </Suspense>
  );
}
