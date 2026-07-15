import type { ReactNode } from "react";

import { cn } from "@qiyun/ui";

export function V2PageHeader({
  title,
  description,
  badge,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pageHeader", className)}>
      <div>
        <h2>
          {title}
          {badge ? <span className="badge">{badge}</span> : null}
        </h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
