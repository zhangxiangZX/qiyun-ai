import { Suspense } from "react";
import { QuotationPreviewWorkspace } from "@/components/sales/quotation-preview-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function QuotationPreviewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuotationPreviewWorkspace />
    </Suspense>
  );
}
