import { Suspense } from "react";

import { AiTestWorkspace } from "@/components/conversations/ai-test-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function AiConversationTestPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AiTestWorkspace />
    </Suspense>
  );
}
