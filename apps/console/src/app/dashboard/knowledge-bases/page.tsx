import { Suspense } from "react";

import { KnowledgeManagementWorkspace } from "@/components/knowledge/knowledge-management-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function KnowledgeBasesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <KnowledgeManagementWorkspace />
    </Suspense>
  );
}
