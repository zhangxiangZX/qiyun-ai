import { Suspense } from "react";

import { InquiryDetailWorkspace } from "@/components/sales/inquiry-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function InquiryDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InquiryDetailWorkspace />
    </Suspense>
  );
}
