import { Suspense } from "react";

import { InquiryDetailWorkspace } from "@/components/sales/inquiry-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InquiryDetailWorkspace inquiryId={id} />
    </Suspense>
  );
}
