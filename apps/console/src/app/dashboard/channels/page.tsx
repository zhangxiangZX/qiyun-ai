import { Suspense } from "react";

import { ChannelAccessWorkspace } from "@/components/channels/channel-access-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ChannelsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChannelAccessWorkspace />
    </Suspense>
  );
}
