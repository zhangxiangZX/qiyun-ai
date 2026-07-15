import { Suspense } from "react";

import { SalesAssistantWorkspace } from "@/components/sales/sales-assistant-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SalesAssistantPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesAssistantWorkspace />
    </Suspense>
  );
}
