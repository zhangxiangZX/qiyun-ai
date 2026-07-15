import { Suspense } from "react";

import { LeadDetailPage } from "@/components/leads/lead-detail-page";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function LeadDetailPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadDetailPage leadId={id} />
    </Suspense>
  );
}
