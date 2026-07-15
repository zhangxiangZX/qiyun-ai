import { Suspense } from "react";

import { TicketsWorkspace } from "@/components/sales/tickets-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function TicketsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TicketsWorkspace />
    </Suspense>
  );
}
