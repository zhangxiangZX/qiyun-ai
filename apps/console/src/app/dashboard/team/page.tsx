import { Suspense } from "react";

import { MembersWorkspace } from "@/components/team/members-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function TeamPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MembersWorkspace />
    </Suspense>
  );
}
