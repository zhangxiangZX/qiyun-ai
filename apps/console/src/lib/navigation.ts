import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  ClipboardCheck,
  Globe2,
  LayoutDashboard,
  MailPlus,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const workspaceNavigation: NavigationItem[] = [
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
  {
    title: "团队",
    href: "/dashboard/team",
    icon: ShieldCheck,
  },
  {
    title: "邀请审批",
    href: "/dashboard/invitations",
    icon: MailPlus,
  },
  {
    title: "系统状态",
    href: "/dashboard/system-status",
    icon: Activity,
  },
  {
    title: "联调验收",
    href: "/dashboard/acceptance",
    icon: ClipboardCheck,
  },
];

export const platformAdminNavigation: NavigationItem[] = [
  {
    title: "超级管理员",
    href: "/dashboard/super-admin",
    icon: ShieldCheck,
    exact: true,
  },
  {
    title: "系统状态",
    href: "/dashboard/system-status",
    icon: Activity,
  },
];

export function getNavigation(platformRole?: "platform_admin" | null): NavigationItem[] {
  return platformRole === "platform_admin" ? platformAdminNavigation : workspaceNavigation;
}

export function getActiveNavItem(
  pathname: string,
  platformRole?: "platform_admin" | null,
) {
  return getNavigation(platformRole).find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  );
}
