import { Suspense } from "react";
import { SelectionMobileWorkspace } from "@/components/bots/selection-mobile-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SelectionMobilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SelectionMobileWorkspace />
    </Suspense>
  );
}
