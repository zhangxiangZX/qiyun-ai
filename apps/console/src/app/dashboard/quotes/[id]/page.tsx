import { Suspense } from "react";

import { QuoteDetailWorkspace } from "@/components/sales/quote-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuoteDetailWorkspace quoteId={id} />
    </Suspense>
  );
}
