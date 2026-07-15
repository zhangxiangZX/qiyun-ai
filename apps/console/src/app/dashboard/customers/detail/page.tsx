"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { CustomerDetailWorkspace } from "@/components/sales/customer-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

function CustomerDetailContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  return <CustomerDetailWorkspace customerId={customerId} />;
}

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerDetailContent />
    </Suspense>
  );
}
