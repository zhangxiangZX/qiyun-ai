import { Suspense } from "react";

import { ConversationsWorkspace } from "@/components/conversations/conversations-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ConversationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConversationsWorkspace />
    </Suspense>
  );
}
