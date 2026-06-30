import { Badge } from "@qiyun/ui";

import { formatLeadStatus } from "@/lib/leads/format";
import type { LeadStatus } from "@/lib/leads/types";

function statusVariant(status: LeadStatus) {
  switch (status) {
    case "new":
      return "info" as const;
    case "following":
      return "warning" as const;
    case "won":
      return "success" as const;
    case "invalid":
      return "secondary" as const;
  }
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={statusVariant(status)}>{formatLeadStatus(status)}</Badge>;
}
