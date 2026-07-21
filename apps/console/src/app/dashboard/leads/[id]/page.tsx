import { Suspense } from "react";

import { LeadDetailPage } from "@/components/leads/lead-detail-page";
import { PageSkeleton } from "@/components/layout/page-skeleton";

/** V2 保留路由（侧栏隐藏）；列表内抽屉与跟进页仍链到此详情。 */
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
