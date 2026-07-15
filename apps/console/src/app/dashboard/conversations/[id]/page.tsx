import { Suspense } from "react";

import { ConversationDetailPage } from "@/components/conversations/conversation-detail-page";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function ConversationDetailPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConversationDetailPage conversationId={id} />
    </Suspense>
  );
}
