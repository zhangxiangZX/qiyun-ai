import { Suspense } from "react";

import { CustomersWorkspace } from "@/components/sales/customers-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function CustomersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomersWorkspace />
    </Suspense>
  );
}
