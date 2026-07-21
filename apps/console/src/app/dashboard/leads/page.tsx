import { Suspense } from "react";

import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

/** V2 保留路由（侧栏隐藏）；V1 主入口为询盘中心。 */
export default function LeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadsWorkspace />
    </Suspense>
  );
}
