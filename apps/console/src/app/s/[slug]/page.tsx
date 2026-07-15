import type { Metadata } from "next";

import { Suspense } from "react";

import { AiSelectionPublicPage } from "@/components/channels/ai-selection-public-page";
import { getDefaultSelectionPageConfig } from "@/lib/channels/ai-selection-page-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getDefaultSelectionPageConfig(slug);
  return {
    title: config?.header.title ?? "AI 产品选型助手",
    description: config?.robot.openingMessage,
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

function SelectionPublicPageContent({ slug }: { slug: string }) {
  return <AiSelectionPublicPage slug={slug} />;
}

export default async function SelectionPublicRoute({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: "center" }}>正在加载选型页…</div>}>
      <SelectionPublicPageContent slug={slug} />
    </Suspense>
  );
}
