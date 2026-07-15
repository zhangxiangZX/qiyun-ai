import { Suspense } from "react";

import { AddSiteWorkspace } from "@/components/sites/add-site-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function AddSitePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AddSiteWorkspace />
    </Suspense>
  );
}
