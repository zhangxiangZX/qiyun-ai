import { EmptyState, PageHeader, StatCard } from "@qiyun/ui";
import { BarChart3, Bot, Clock3, FolderOpen, MessageSquareText } from "lucide-react";

import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

const metrics = [
  {
    label: "Active bots",
    value: "12",
    description: "Covers 4 workspaces with 3 new bots added this week.",
    trend: "+25%",
  },
  {
    label: "Knowledge docs",
    value: "84",
    description: "PDF, DOCX, TXT, and MD files have already been parsed.",
    trend: "Stable",
  },
  {
    label: "Conversations this week",
    value: "1,268",
    description: "Average first reply is 1.9s with 14 lead captures.",
    trend: "+18%",
  },
  {
    label: "First token P95",
    value: "< 5s",
    description: "The chat stream and retrieval chain are healthy.",
    trend: "SLO",
  },
];

const quickFacts = [
  { icon: Bot, label: "Bots", value: "7 enabled" },
  { icon: FolderOpen, label: "Knowledge bases", value: "4 synced" },
  { icon: MessageSquareText, label: "Latest conversation", value: "21 minutes ago" },
  { icon: Clock3, label: "Open leads", value: "3 items" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(defaultLocale, "dashboard.eyebrow")}
        title={t(defaultLocale, "dashboard.title")}
        description={t(defaultLocale, "dashboard.description")}
      />

      <section className="px-4 sm:px-6 lg:px-page">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
              trend={<span className="rounded-full bg-muted px-2 py-1 text-xs">{metric.trend}</span>}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 px-4 sm:px-6 lg:grid-cols-[1.35fr_0.9fr] lg:px-page">
        <div className="rounded-card border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Today at a glance</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is a presentation-ready placeholder. Once the real API lands, we can swap it
                for live data without changing the layout.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              MVP
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {quickFacts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div
                  key={fact.label}
                  className="flex items-center gap-3 rounded-card border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-control bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-card-foreground">{fact.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title={t(defaultLocale, "dashboard.empty.title")}
          description={t(defaultLocale, "dashboard.empty.description")}
          action={<DashboardEmptyAction />}
        />
      </section>
    </div>
  );
}
