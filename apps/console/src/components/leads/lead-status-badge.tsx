import { Badge } from "@qiyun/ui";

import { formatLeadStatus } from "@/lib/leads/format";
import type { LeadStatus } from "@/lib/leads/types";

function statusVariant(status: LeadStatus) {
  switch (status) {
    case "new":
      return "info" as const;
    case "pending":
      return "warning" as const;
    case "contacted":
      return "secondary" as const;
    case "proposal":
      return "default" as const;
    case "won":
      return "success" as const;
    case "invalid":
      return "destructive" as const;
  }
}

const statusAccentClass: Record<LeadStatus, string> = {
  new: "border-l-info bg-info/5",
  pending: "border-l-warning bg-warning/5",
  contacted: "border-l-border bg-muted/30",
  proposal: "border-l-primary bg-primary/5",
  won: "border-l-success bg-success/5",
  invalid: "border-l-muted-foreground/30 bg-muted/20",
};

export function LeadStatusBadge({
  status,
  size = "default",
  showStrip = false,
}: {
  status: LeadStatus;
  size?: "default" | "lg";
  showStrip?: boolean;
}) {
  const badge = (
    <Badge
      variant={statusVariant(status)}
      className={size === "lg" ? "px-3 py-1 text-sm font-semibold" : undefined}
    >
      {formatLeadStatus(status)}
    </Badge>
  );

  if (!showStrip) {
    return badge;
  }

  return (
    <div
      className={`inline-flex items-center rounded-control border border-border/60 border-l-4 px-3 py-2 ${statusAccentClass[status]}`}
    >
      {badge}
    </div>
  );
}
