import type { ReactNode } from "react";

import { EmptyState, PageHeader } from "@qiyun/ui";

export interface PlaceholderPageProps {
  title?: string;
  description?: string;
  segment?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

const fallbackContent: Record<string, { title: string; description: string }> = {
  bots: {
    title: "Bots",
    description: "Manage the assistant configuration, prompts, and connected knowledge bases.",
  },
  conversations: {
    title: "Conversations",
    description: "Review live and historical customer chats in one place.",
  },
  knowledge: {
    title: "Knowledge",
    description: "Organize source documents and track ingestion progress.",
  },
  leads: {
    title: "Leads",
    description: "Capture qualified leads and follow up with context.",
  },
  sites: {
    title: "Sites",
    description: "Configure widgets, domains, and embed settings.",
  },
};

export function PlaceholderPage({ title, description, segment, icon, action }: PlaceholderPageProps) {
  const fallback = segment ? fallbackContent[segment] : undefined;
  const resolvedTitle = title ?? fallback?.title ?? "Coming Soon";
  const resolvedDescription =
    description ?? fallback?.description ?? "This section is being prepared for the next release.";

  return (
    <div className="space-y-6">
      <PageHeader title={resolvedTitle} description={resolvedDescription} />
      <div className="px-4 sm:px-6 lg:px-page">
        <EmptyState title={resolvedTitle} description={resolvedDescription} icon={icon} action={action} />
      </div>
    </div>
  );
}

export default PlaceholderPage;
