import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  /** `compact` hides the title — use when the shell topbar already shows the page name. */
  variant?: "default" | "compact";
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  variant = "default",
  className,
}: PageHeaderProps) {
  const compact = variant === "compact";

  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow ? (
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
        ) : null}
        {compact ? null : (
          <h1 className="text-h1 tracking-tight text-foreground">
            {title}
          </h1>
        )}
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
