import { Suspense } from "react";

import { QuotationEditWorkspace } from "@/components/sales/quotation-edit-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function QuotationEditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuotationEditWorkspace />
    </Suspense>
  );
}
