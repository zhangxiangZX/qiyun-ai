import { Suspense } from "react";
import { CreateLinkWorkspace } from "@/components/channels/create-link-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function NewSalesLinkPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CreateLinkWorkspace />
    </Suspense>
  );
}
