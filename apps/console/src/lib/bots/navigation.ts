import type { LucideIcon } from "lucide-react";
import { BookOpenText, Code2, FileText, Settings2, Shield } from "lucide-react";

import type { BotEditSection } from "./types";

export interface BotEditNavItem {
  id: BotEditSection;
  label: string;
  href: (botId: string) => string;
  icon: LucideIcon;
}

export const botEditNav: BotEditNavItem[] = [
  {
    id: "basics",
    label: "基础设置",
    href: (botId) => `/dashboard/bots/${botId}/basics`,
    icon: Settings2,
  },
  {
    id: "knowledge",
    label: "知识库",
    href: (botId) => `/dashboard/bots/${botId}/knowledge`,
    icon: BookOpenText,
  },
  {
    id: "behavior",
    label: "行为与安全",
    href: (botId) => `/dashboard/bots/${botId}/behavior`,
    icon: Shield,
  },
  {
    id: "leads",
    label: "留资表单",
    href: (botId) => `/dashboard/bots/${botId}/leads`,
    icon: FileText,
  },
  {
    id: "install",
    label: "安装代码",
    href: (botId) => `/dashboard/bots/${botId}/install`,
    icon: Code2,
  },
];

export function getBotEditSection(pathname: string): BotEditSection {
  const segment = pathname.split("/").pop();
  const match = botEditNav.find((item) => item.id === segment);
  return match?.id ?? "basics";
}
