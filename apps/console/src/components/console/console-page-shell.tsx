import type { ReactNode } from "react";

import { cn } from "@qiyun/ui";

export function ConsolePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("page-stack", className)}>{children}</div>;
}

/** Mode banners, read-only notices, and inline feedback — stacks with consistent gap. */
export function ConsolePageAlerts({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("page-section flex flex-col gap-3", className)}>{children}</div>;
}

export function ConsolePageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("page-section", className)}>{children}</section>;
}
