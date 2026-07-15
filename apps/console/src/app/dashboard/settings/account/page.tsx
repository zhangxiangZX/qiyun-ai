import { Suspense } from "react";

import { AccountSettingsWorkspace } from "@/components/settings/account-settings-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountSettingsWorkspace />
    </Suspense>
  );
}
