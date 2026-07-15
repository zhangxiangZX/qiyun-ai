import { Suspense } from "react";

import { WebsiteWidgetWorkspace } from "@/components/sites/website-widget-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SitesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WebsiteWidgetWorkspace />
    </Suspense>
  );
}
