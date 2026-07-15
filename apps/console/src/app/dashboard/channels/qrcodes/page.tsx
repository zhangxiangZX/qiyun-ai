import { Suspense } from "react";

import { QrcodeManagementWorkspace } from "@/components/channels/qrcode-management-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function QrcodeManagementPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QrcodeManagementWorkspace />
    </Suspense>
  );
}
