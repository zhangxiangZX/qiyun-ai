import { Suspense } from "react";

import { InquiryAssignmentWorkspace } from "@/components/sales/inquiry-assignment-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function InquiryAssignmentPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InquiryAssignmentWorkspace />
    </Suspense>
  );
}
