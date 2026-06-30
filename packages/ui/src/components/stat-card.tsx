import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  trend?: ReactNode;
}

export function StatCard({ label, value, description, trend }: StatCardProps) {
  return (
    <section className="rounded-card border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-card-foreground">{value}</p>
        </div>
        {trend ? <div className="text-sm text-muted-foreground">{trend}</div> : null}
      </div>
      {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
    </section>
  );
}
