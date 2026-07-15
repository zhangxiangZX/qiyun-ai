import { Suspense } from "react";
import { KnowledgeUploadWorkspace } from "@/components/knowledge/knowledge-upload-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function KnowledgeUploadPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <KnowledgeUploadWorkspace />
    </Suspense>
  );
}
