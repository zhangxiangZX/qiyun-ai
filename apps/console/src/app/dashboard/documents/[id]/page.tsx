import { Suspense } from "react";

import { DocumentDetailWorkspace } from "@/components/documents/document-detail-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentDetailWorkspace documentId={id} />
    </Suspense>
  );
}
