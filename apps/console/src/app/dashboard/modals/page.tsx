import { Suspense } from "react";

import { ModalDemoWorkspace } from "@/components/shared/modal-demo-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ModalsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModalDemoWorkspace />
    </Suspense>
  );
}
