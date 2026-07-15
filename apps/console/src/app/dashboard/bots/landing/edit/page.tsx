import { Suspense } from "react";

import { AiStandaloneEditWorkspace } from "@/components/channels/ai-standalone-edit-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SelectionEditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AiStandaloneEditWorkspace />
    </Suspense>
  );
}
