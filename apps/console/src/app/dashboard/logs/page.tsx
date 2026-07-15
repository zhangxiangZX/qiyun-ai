import { Suspense } from "react";

import { AuditLogWorkspace } from "@/components/audit/audit-log-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function LogsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditLogWorkspace />
    </Suspense>
  );
}
