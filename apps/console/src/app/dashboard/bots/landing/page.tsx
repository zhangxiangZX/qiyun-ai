import { Suspense } from "react";

import { AiStandaloneWorkspace } from "@/components/channels/ai-standalone-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function AiSelectionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AiStandaloneWorkspace />
    </Suspense>
  );
}
