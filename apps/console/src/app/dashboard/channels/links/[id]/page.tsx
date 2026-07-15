import { Suspense } from "react";
import { SalesLinkDetailWorkspace } from "@/components/channels/sales-link-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function SalesLinkDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalesLinkDetailWorkspace />
    </Suspense>
  );
}
