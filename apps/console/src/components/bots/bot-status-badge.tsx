import { Badge } from "@qiyun/ui";

import { formatBotStatus } from "@/lib/bots/format";
import type { BotStatus } from "@/lib/bots/types";

function statusVariant(status: BotStatus) {
  switch (status) {
    case "enabled":
      return "success" as const;
    case "disabled":
      return "secondary" as const;
    case "draft":
      return "warning" as const;
  }
}

export function BotStatusBadge({ status }: { status: BotStatus }) {
  return <Badge variant={statusVariant(status)}>{formatBotStatus(status)}</Badge>;
}
