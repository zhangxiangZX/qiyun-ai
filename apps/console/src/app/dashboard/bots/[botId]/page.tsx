import { redirect } from "next/navigation";

export default async function BotEditIndexPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  redirect(`/dashboard/bots/${botId}/basics`);
}
