import { Suspense } from "react";

import { InviteMemberWorkspace } from "@/components/team/invite-member-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function InvitePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InviteMemberWorkspace />
    </Suspense>
  );
}
