import { Suspense } from "react";

import { WidgetInstallWorkspace } from "@/components/sites/widget-install-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function WidgetInstallPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WidgetInstallWorkspace />
    </Suspense>
  );
}
