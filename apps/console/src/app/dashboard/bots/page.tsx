import { Suspense } from "react";

import { AssistantsWorkspace } from "@/components/bots/assistants-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function BotsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AssistantsWorkspace />
    </Suspense>
  );
}
