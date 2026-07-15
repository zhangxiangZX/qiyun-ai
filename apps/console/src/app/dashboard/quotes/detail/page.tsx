import { Suspense } from "react";

import { QuotationDetailWorkspace } from "@/components/sales/quotation-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function QuotationDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuotationDetailWorkspace />
    </Suspense>
  );
}
