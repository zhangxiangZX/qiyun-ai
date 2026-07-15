import { Suspense } from "react";

import { WidgetAppearanceWorkspace } from "@/components/sites/widget-appearance-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function WidgetAppearancePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WidgetAppearanceWorkspace />
    </Suspense>
  );
}
