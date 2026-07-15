import { Suspense } from "react";

import { ChannelAnalysisWorkspace } from "@/components/reports/channel-analysis-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ChannelAnalysisPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChannelAnalysisWorkspace />
    </Suspense>
  );
}
