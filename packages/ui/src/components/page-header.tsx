import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border bg-background/80 px-page py-6 backdrop-blur sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-7",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <div className="text-sm font-medium text-primary">{eyebrow}</div> : null}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
