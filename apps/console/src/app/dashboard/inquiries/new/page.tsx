import { Suspense } from "react";

import { NewInquiryWorkspace } from "@/components/sales/new-inquiry-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function NewInquiryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewInquiryWorkspace />
    </Suspense>
  );
}
