import { redirect } from "next/navigation";

import { buildAiStandaloneNewHref } from "@/lib/channels/ai-standalone-shared";

export default function SelectionNewPage() {
  redirect(buildAiStandaloneNewHref("basic"));
}
