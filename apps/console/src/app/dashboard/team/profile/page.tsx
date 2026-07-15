import { Suspense } from "react";

import { EnterpriseProfileWorkspace } from "@/components/team/enterprise-profile-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EnterpriseProfileWorkspace />
    </Suspense>
  );
}
