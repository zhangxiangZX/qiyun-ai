import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenText,
  Bot,
  Globe2,
  LayoutDashboard,
  MessageSquareText,
  Users,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const navigation: NavigationItem[] = [
  {
    title: "概览",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "机器人",
    href: "/dashboard/bots",
    icon: Bot,
  },
  {
    title: "知识库",
    href: "/dashboard/knowledge-bases",
    icon: BookOpenText,
  },
  {
    title: "会话",
    href: "/dashboard/conversations",
    icon: MessageSquareText,
  },
  {
    title: "线索",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    title: "站点",
    href: "/dashboard/sites",
    icon: Globe2,
  },
  {
    title: "报表",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
];

export function getActiveNavItem(pathname: string) {
  return navigation.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  );
}
