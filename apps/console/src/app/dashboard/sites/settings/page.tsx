import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SitesWorkspace } from "@/components/sites/sites-workspace";

export default function SiteSecuritySettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SitesWorkspace />
    </Suspense>
  );
}
