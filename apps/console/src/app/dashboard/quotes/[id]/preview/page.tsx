import { Suspense } from "react";
import { QuotationPreviewWorkspace } from "@/components/sales/quotation-preview-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function QuotationPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuotationPreviewWorkspace quoteId={id} />
    </Suspense>
  );
}
