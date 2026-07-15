import { Suspense } from "react";

import { InquiriesWorkspace } from "@/components/sales/inquiries-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function InquiriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InquiriesWorkspace />
    </Suspense>
  );
}
