import { Suspense } from "react";

import { ReportExportWorkspace } from "@/components/reports/report-export-workspace";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function ReportExportPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportExportWorkspace />
    </Suspense>
  );
}
