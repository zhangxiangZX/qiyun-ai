import { Suspense } from "react";

import { NewQuotationWorkspace } from "@/components/sales/new-quotation-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewQuotationWorkspace />
    </Suspense>
  );
}
