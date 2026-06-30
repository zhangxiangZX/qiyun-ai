import { Badge } from "@qiyun/ui";

import { formatConversationStatus } from "@/lib/conversations/format";
import type { ConversationStatus } from "@/lib/conversations/types";

function statusVariant(status: ConversationStatus) {
  switch (status) {
    case "open":
      return "info" as const;
    case "resolved":
      return "success" as const;
    case "unresolved":
      return "warning" as const;
    case "pending":
      return "secondary" as const;
  }
}

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  return <Badge variant={statusVariant(status)}>{formatConversationStatus(status)}</Badge>;
}
