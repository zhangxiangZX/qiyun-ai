import { Suspense } from "react";

import { EnterpriseProfileEditWorkspace } from "@/components/team/enterprise-profile-edit-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ProfileEditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EnterpriseProfileEditWorkspace />
    </Suspense>
  );
}
