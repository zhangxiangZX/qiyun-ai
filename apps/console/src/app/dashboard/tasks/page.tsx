import { Suspense } from "react";

import { TasksWorkspace } from "@/components/sales/tasks-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function TasksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksWorkspace />
    </Suspense>
  );
}
