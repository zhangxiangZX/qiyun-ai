import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { PublicQuoteCustomerPage } from "@/components/quotes/public-quote-customer-page";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "客户专属报价",
  description: "查看并确认专属报价方案",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function PublicQuoteRoute({ params }: PageProps) {
  const { token } = await params;
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, textAlign: "center", fontSize: 14, color: "#64748b" }}>
          正在加载报价…
        </div>
      }
    >
      <PublicQuoteCustomerPage token={token} />
    </Suspense>
  );
}
