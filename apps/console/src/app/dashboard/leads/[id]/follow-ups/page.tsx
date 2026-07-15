import { Suspense } from "react";

import { FollowUpDetailWorkspace } from "@/components/leads/follow-up-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function FollowUpDetailPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FollowUpDetailWorkspace leadId={id} />
    </Suspense>
  );
}
