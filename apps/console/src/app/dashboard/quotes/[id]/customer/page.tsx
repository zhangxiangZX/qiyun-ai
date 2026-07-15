import { Suspense } from "react";

import { CustomerQuotationWorkspace } from "@/components/sales/customer-quotation-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function CustomerQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerQuotationWorkspace quoteId={id} />
    </Suspense>
  );
}
