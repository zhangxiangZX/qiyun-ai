import type { ReactNode } from "react";

import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  actionLabel,
  onAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center rounded-card border border-border/80 bg-card px-6 py-12 text-center shadow-card">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold tracking-tight text-card-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {action ?? (actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null)}
        {secondaryAction}
      </div>
    </section>
  );
}
