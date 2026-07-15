import { Suspense } from "react";

import { AdminDashboardWorkspace } from "@/components/dashboard/admin-dashboard-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminDashboardWorkspace />
    </Suspense>
  );
}
