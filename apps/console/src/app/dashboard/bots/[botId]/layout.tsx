import type { ReactNode } from "react";

import { BotEditProvider } from "@/components/bots/bot-edit-context";
import { BotEditShell } from "@/components/bots/bot-edit-shell";

export default async function BotEditLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;

  return (
    <BotEditProvider botId={botId}>
      <BotEditShell>{children}</BotEditShell>
    </BotEditProvider>
  );
}
