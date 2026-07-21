import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { PublicSubmitSuccessPage } from "@/components/shared/public-submit-success-page";

export const metadata: Metadata = {
  title: "提交成功",
  description: "需求已提交成功",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function PublicSuccessRoute() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, textAlign: "center", fontSize: 14, color: "#64748b" }}>
          加载中…
        </div>
      }
    >
      <PublicSubmitSuccessPage />
    </Suspense>
  );
}
