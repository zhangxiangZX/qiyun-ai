import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { SalesLinkPublicLanding } from "@/components/channels/sales-link-public-landing";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "销售获客链接",
  description: "正在打开销售获客链接",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function SalesLinkPublicPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, textAlign: "center", fontSize: 14, color: "#64748b" }}>
          正在打开销售链接…
        </div>
      }
    >
      <SalesLinkPublicLanding slug={slug} />
    </Suspense>
  );
}
