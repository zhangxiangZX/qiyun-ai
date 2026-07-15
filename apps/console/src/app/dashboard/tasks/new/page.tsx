import { Suspense } from "react";

import { NewTaskWorkspace } from "@/components/sales/new-task-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function NewTaskPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewTaskWorkspace />
    </Suspense>
  );
}
