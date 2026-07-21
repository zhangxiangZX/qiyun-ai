import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  FileText,
  Globe2,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Target,
  Wrench,
} from "lucide-react";

import { roleHomeNavIdForRole, type WorkspaceRole } from "@/lib/auth/workspace-home";

export interface NavigationLink {
  id: string;
  title: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
  /** When set, only `matchPrefixes` activate this item, not the bare `href` path. */
  matchPrefixesOnly?: boolean;
  /** Pathname must end with this suffix (e.g. `/preview`) after prefix match. */
  matchPathEndsWith?: string;
  /** Pathname must not end with any of these suffixes after prefix match. */
  excludePathEndsWith?: string[];
  /** Pathname must not start with any of these prefixes after prefix match. */
  excludePathPrefixes?: string[];
}

export interface NavigationGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  href?: string;
  exact?: boolean;
  children?: NavigationLink[];
}

type HiddenNavigationLink = NavigationLink & { groupId: string };

/**
 * V2、原型与详情页路由：不出现在 V1 侧栏，但保留匹配以正确高亮所属分组。
 */
const hiddenNavigationLinksForMatching: HiddenNavigationLink[] = [
  {
    groupId: "workspace",
    id: "workspace-home",
    title: "首页概览",
    href: "/dashboard",
    exact: true,
  },
  {
    groupId: "ai-center",
    id: "bot-config-deep",
    title: "助手详情",
    href: "/dashboard/bots/detail",
    matchPrefixes: ["/dashboard/bots/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "ai-center",
    id: "conversation-detail",
    title: "会话详情",
    href: "/dashboard/conversations/detail",
    matchPrefixes: ["/dashboard/conversations/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "ai-center",
    id: "conversation-list",
    title: "会话中心",
    href: "/dashboard/conversations",
    exact: true,
  },
  {
    groupId: "ai-center",
    id: "knowledge-upload",
    title: "知识库上传",
    href: "/dashboard/knowledge-bases/upload",
    matchPrefixes: ["/dashboard/knowledge-bases/upload"],
  },
  {
    groupId: "acquisition",
    id: "ai-landing-tab",
    title: "AI 选型独立页",
    href: "/dashboard/bots/landing",
    matchPrefixes: ["/dashboard/bots/landing"],
  },
  {
    groupId: "acquisition",
    id: "add-site-form",
    title: "添加站点",
    href: "/dashboard/sites/new",
    matchPrefixes: ["/dashboard/sites/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "acquisition",
    id: "channel-access",
    title: "渠道接入",
    href: "/dashboard/channels",
    exact: true,
  },
  {
    groupId: "customer-opportunity",
    id: "lead-list",
    title: "线索列表（已合并至询盘）",
    href: "/dashboard/leads",
    matchPrefixes: ["/dashboard/leads"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "inquiry-detail",
    title: "询盘详情",
    href: "/dashboard/inquiries",
    matchPrefixes: ["/dashboard/inquiries/"],
    matchPrefixesOnly: true,
    excludePathPrefixes: ["/dashboard/inquiries/new", "/dashboard/inquiries/assign"],
  },
  {
    groupId: "customer-opportunity",
    id: "inquiry-new",
    title: "表单新建询盘",
    href: "/dashboard/inquiries/new",
    matchPrefixes: ["/dashboard/inquiries/new"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "inquiry-assign",
    title: "询盘分配",
    href: "/dashboard/inquiries/assign",
    matchPrefixes: ["/dashboard/inquiries/assign"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "sales-assistant",
    title: "销售助手",
    href: "/dashboard/sales-assistant",
  },
  {
    groupId: "customer-opportunity",
    id: "documents",
    title: "销售资料库",
    href: "/dashboard/documents",
  },
  {
    groupId: "customer-opportunity",
    id: "document-detail",
    title: "销售资料详情",
    href: "/dashboard/documents/detail",
    matchPrefixes: ["/dashboard/documents/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "customer-list",
    title: "客户档案",
    href: "/dashboard/customers",
    exact: true,
  },
  {
    groupId: "customer-opportunity",
    id: "customer-detail",
    title: "客户详情",
    href: "/dashboard/customers/detail",
    matchPrefixes: ["/dashboard/customers/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "customer-ops",
    title: "客户运营",
    href: "/dashboard/customers/ops",
  },
  {
    groupId: "customer-opportunity",
    id: "repurchase",
    title: "复购提醒",
    href: "/dashboard/customers/repurchase",
  },
  {
    groupId: "customer-opportunity",
    id: "tickets",
    title: "工单中心",
    href: "/dashboard/tickets",
  },
  {
    groupId: "customer-opportunity",
    id: "geo",
    title: "地域分布",
    href: "/dashboard/geo",
  },
  {
    groupId: "customer-opportunity",
    id: "after-sales",
    title: "售后咨询",
    href: "/dashboard/conversations/after-sales",
    matchPrefixes: ["/dashboard/conversations/after-sales"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "acquisition",
    id: "sales-link-detail",
    title: "销售链接详情",
    href: "/dashboard/channels/links/detail",
    matchPrefixes: ["/dashboard/channels/links/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "acquisition",
    id: "qrcode-management",
    title: "二维码",
    href: "/dashboard/channels/qrcodes",
    matchPrefixes: ["/dashboard/channels/qrcodes"],
  },
  {
    groupId: "quote-management",
    id: "quote-new",
    title: "新建报价",
    href: "/dashboard/quotes/new",
    matchPrefixes: ["/dashboard/quotes/new"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "quote-management",
    id: "quote-preview",
    title: "PDF预览",
    href: "/dashboard/quotes/detail/preview",
    matchPrefixes: ["/dashboard/quotes/"],
    matchPrefixesOnly: true,
    matchPathEndsWith: "/preview",
    excludePathPrefixes: ["/dashboard/quotes/templates"],
  },
  {
    groupId: "quote-management",
    id: "quote-customer",
    title: "客户报价页",
    href: "/dashboard/quotes/detail/customer",
    matchPrefixes: ["/dashboard/quotes/"],
    matchPrefixesOnly: true,
    matchPathEndsWith: "/customer",
    excludePathPrefixes: ["/dashboard/quotes/templates"],
  },
  {
    groupId: "customer-opportunity",
    id: "follow-record",
    title: "跟进记录",
    href: "/dashboard/leads/detail/follow-ups",
    matchPrefixes: ["/dashboard/leads/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "task-detail",
    title: "跟进任务详情",
    href: "/dashboard/tasks/supplement",
    matchPrefixes: ["/dashboard/tasks/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "customer-opportunity",
    id: "calendar",
    title: "跟进日历",
    href: "/dashboard/calendar",
  },
  {
    groupId: "quote-management",
    id: "quote-detail",
    title: "报价详情",
    href: "/dashboard/quotes",
    matchPrefixes: ["/dashboard/quotes/"],
    matchPrefixesOnly: true,
    // 详情页与 PDF/客户页共用 /dashboard/quotes/[id] 前缀，需排除子页与模板路由
    excludePathEndsWith: ["/preview", "/customer", "/edit"],
    excludePathPrefixes: ["/dashboard/quotes/templates", "/dashboard/quotes/new", "/dashboard/quotes/detail"],
  },
  {
    groupId: "quote-management",
    id: "quote-template-detail",
    title: "报价模板编辑",
    href: "/dashboard/quotes/templates/detail",
    matchPrefixes: ["/dashboard/quotes/templates/"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "data-center",
    id: "reports-hub",
    title: "报表中心",
    href: "/dashboard/reports",
    exact: true,
  },
  {
    groupId: "data-center",
    id: "bot-insights",
    title: "机器人洞察",
    href: "/dashboard/reports/bot-insights",
  },
  {
    groupId: "data-center",
    id: "lost-reasons",
    title: "丢单原因",
    href: "/dashboard/reports/lost-reasons",
  },
  {
    groupId: "ai-center",
    id: "business-rules",
    title: "AI 业务规则",
    href: "/dashboard/settings/business-rules",
  },
  {
    groupId: "settings",
    id: "invitations-review",
    title: "邀请审批",
    href: "/dashboard/invitations",
  },
  {
    groupId: "ai-center",
    id: "bot-config",
    title: "助手配置",
    href: "/dashboard/bots/config",
  },
  {
    groupId: "settings",
    id: "settings-hub",
    title: "设置总览",
    href: "/dashboard/settings",
    exact: true,
  },
  {
    groupId: "settings",
    id: "team-invite",
    title: "邀请成员",
    href: "/dashboard/team/invite",
  },
  {
    groupId: "settings",
    id: "company-profile-edit",
    title: "企业资料编辑",
    href: "/dashboard/team/profile/edit",
    matchPrefixes: ["/dashboard/team/profile/edit"],
    matchPrefixesOnly: true,
  },
  {
    groupId: "settings",
    id: "team-billing",
    title: "套餐与账单",
    href: "/dashboard/team/billing",
  },
  {
    groupId: "settings",
    id: "team-security",
    title: "安全设置",
    href: "/dashboard/team/security",
  },
  {
    groupId: "workspace",
    id: "modals-test",
    title: "弹窗测试",
    href: "/dashboard/modals",
  },
  {
    groupId: "workspace",
    id: "success-page",
    title: "提交成功",
    href: "/dashboard/success",
  },
];

/** 企云图 AI V1 侧栏 — 7 个一级主类（冻结，见 docs/36-v1-product-structure-final.md）
 *  侧栏仅展示可直达的管理入口；详情/子流程/V2 页走 hiddenNavigationLinksForMatching。
 */
export const workspaceNavigationGroups: NavigationGroup[] = [
  {
    id: "workspace",
    title: "工作台",
    icon: LayoutDashboard,
    children: [
      { id: "boss-home", title: "首页", href: "/dashboard/boss" },
      { id: "admin-home", title: "首页", href: "/dashboard/admin" },
      { id: "sales-rep-home", title: "首页", href: "/dashboard/sales-rep" },
    ],
  },
  {
    id: "customer-opportunity",
    title: "客户机会",
    icon: Target,
    children: [
      {
        id: "quick-entry",
        title: "AI 快速录入",
        href: "/dashboard/quick-entry",
        matchPrefixes: ["/dashboard/quick-entry"],
      },
      {
        id: "inquiry-center",
        title: "询盘中心",
        href: "/dashboard/inquiries",
        exact: true,
      },
      { id: "follow-up-tasks", title: "跟进任务", href: "/dashboard/tasks" },
    ],
  },
  {
    id: "acquisition",
    title: "获客中心",
    icon: Globe2,
    children: [
      {
        id: "ai-landing-pages",
        title: "AI 选型独立页",
        href: "/dashboard/bots/landing",
        matchPrefixes: ["/dashboard/bots/landing"],
      },
      {
        id: "sites-widget",
        title: "官网 Widget",
        href: "/dashboard/sites",
        matchPrefixes: ["/dashboard/sites"],
      },
      {
        id: "sales-links",
        title: "销售链接",
        href: "/dashboard/channels/links",
        matchPrefixes: ["/dashboard/channels/links", "/dashboard/channels/qrcodes"],
      },
    ],
  },
  {
    id: "ai-center",
    title: "AI 中心",
    icon: Bot,
    children: [
      { id: "bot-list", title: "AI 助手", href: "/dashboard/bots", exact: true },
      {
        id: "knowledge-base",
        title: "知识库",
        href: "/dashboard/knowledge-bases",
        matchPrefixes: ["/dashboard/knowledge"],
      },
      { id: "conversation-test", title: "AI 测试", href: "/dashboard/conversations/test" },
    ],
  },
  {
    id: "quote-management",
    title: "报价管理",
    icon: FileText,
    children: [
      { id: "quote-list", title: "报价列表", href: "/dashboard/quotes", exact: true },
      {
        id: "quote-templates",
        title: "报价模板",
        href: "/dashboard/quotes/templates",
        matchPrefixes: ["/dashboard/quotes/templates"],
      },
    ],
  },
  {
    id: "data-center",
    title: "数据中心",
    icon: BarChart3,
    children: [
      { id: "sales-funnel", title: "成交漏斗", href: "/dashboard/sales" },
      { id: "channel-analysis", title: "渠道分析", href: "/dashboard/reports/channel" },
      { id: "follow-up-analysis", title: "销售分析", href: "/dashboard/reports/follow-up" },
      { id: "report-export", title: "经营报表导出", href: "/dashboard/reports/export" },
    ],
  },
  {
    id: "settings",
    title: "系统设置",
    icon: Settings2,
    children: [
      { id: "company-profile", title: "企业资料", href: "/dashboard/team/profile" },
      { id: "team-members", title: "团队成员", href: "/dashboard/team", exact: true },
      { id: "team-roles", title: "角色权限", href: "/dashboard/team/roles" },
      { id: "audit-log", title: "操作日志", href: "/dashboard/logs" },
      { id: "account-settings", title: "个人设置", href: "/dashboard/settings/account" },
    ],
  },
];

export const platformAdminNavigationGroups: NavigationGroup[] = [
  {
    id: "platform",
    title: "超级管理员",
    icon: ShieldCheck,
    href: "/dashboard/super-admin",
    exact: true,
  },
  {
    id: "platform-settings",
    title: "系统设置",
    icon: Wrench,
    children: [
      { id: "platform-system-status", title: "系统状态", href: "/dashboard/system-status" },
    ],
  },
];

/** @deprecated Use workspaceNavigationGroups */
export type NavigationItem = NavigationLink & { icon: LucideIcon };

type NavSearchParams = URLSearchParams | string | null | undefined;

function parseNavHref(href: string): { path: string; search: URLSearchParams } {
  const [path = href, query = ""] = href.split("?");
  return { path, search: new URLSearchParams(query) };
}

function toNavSearchParams(params?: NavSearchParams): URLSearchParams {
  if (!params) {
    return new URLSearchParams();
  }
  if (typeof params === "string") {
    const stripped = params.startsWith("?") ? params.slice(1) : params;
    return new URLSearchParams(stripped);
  }
  return new URLSearchParams(params.toString());
}

function requiredSearchMatches(required: URLSearchParams, actual: URLSearchParams): boolean {
  for (const [key, value] of required.entries()) {
    if (actual.get(key) !== value) {
      return false;
    }
  }
  return true;
}

function pathnameEndsWith(pathname: string, suffix: string): boolean {
  return pathname === suffix || pathname.endsWith(suffix) || pathname.endsWith(`${suffix}/`);
}

function pathMatchesLink(link: NavigationLink, pathname: string): boolean {
  const hrefPath = parseNavHref(link.href).path;

  if (link.matchPrefixes?.length) {
    const prefixMatched = link.matchPrefixes.some(
      (prefix) =>
        pathname === prefix ||
        pathname.startsWith(`${prefix}/`) ||
        pathname.startsWith(prefix),
    );
    if (prefixMatched) {
      if (link.matchPathEndsWith && !pathnameEndsWith(pathname, link.matchPathEndsWith)) {
        return false;
      }
      if (
        link.excludePathEndsWith?.some((suffix) => pathnameEndsWith(pathname, suffix))
      ) {
        return false;
      }
      if (
        link.excludePathPrefixes?.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        )
      ) {
        return false;
      }
      return true;
    }
    if (link.matchPrefixesOnly) {
      return false;
    }
  }

  if (link.exact) {
    return pathname === hrefPath;
  }

  if (hrefPath === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function shouldDeferToQueryLink(
  link: NavigationLink,
  pathname: string,
  actualSearch: URLSearchParams,
  allLinks: NavigationLink[],
): boolean {
  const { path: hrefPath, search: requiredSearch } = parseNavHref(link.href);
  if ([...requiredSearch.keys()].length > 0) {
    return false;
  }
  if (!link.exact || pathname !== hrefPath) {
    return false;
  }

  return allLinks.some((other) => {
    if (other.id === link.id) {
      return false;
    }
    const otherParsed = parseNavHref(other.href);
    if (otherParsed.path !== hrefPath) {
      return false;
    }
    if ([...otherParsed.search.keys()].length === 0) {
      return false;
    }
    return requiredSearchMatches(otherParsed.search, actualSearch);
  });
}

function linkMatchesPath(
  link: NavigationLink,
  pathname: string,
  searchParams?: NavSearchParams,
  allLinks: NavigationLink[] = [],
): boolean {
  const { search: requiredSearch } = parseNavHref(link.href);
  const actualSearch = toNavSearchParams(searchParams);

  if (!pathMatchesLink(link, pathname)) {
    return false;
  }

  if ([...requiredSearch.keys()].length > 0) {
    return requiredSearchMatches(requiredSearch, actualSearch);
  }

  if (shouldDeferToQueryLink(link, pathname, actualSearch, allLinks)) {
    return false;
  }

  return true;
}

function linkMatchScore(
  link: NavigationLink,
  pathname: string,
  searchParams?: NavSearchParams,
  allLinks: NavigationLink[] = [],
): number {
  if (!linkMatchesPath(link, pathname, searchParams, allLinks)) {
    return -1;
  }

  const { path: hrefPath, search: requiredSearch } = parseNavHref(link.href);
  const hasRequiredSearch = [...requiredSearch.keys()].length > 0;

  if (hasRequiredSearch) {
    return 20_000 + hrefPath.length + requiredSearch.toString().length;
  }

  if (link.exact && pathname === hrefPath) {
    return 10_000 + hrefPath.length;
  }

  const prefix = link.matchPrefixes?.find(
    (candidate) =>
      pathname === candidate ||
      pathname.startsWith(`${candidate}/`) ||
      pathname.startsWith(candidate),
  );
  if (prefix) {
    // Prefer suffix-specific routes (preview/customer) over generic detail.
    const suffixBonus = link.matchPathEndsWith ? 500 : 0;
    return 5_000 + prefix.length + suffixBonus;
  }

  return hrefPath.length;
}

function groupDirectLinkMatches(group: NavigationGroup, pathname: string): boolean {
  if (!group.href) return false;
  if (group.exact) {
    return pathname === group.href;
  }
  return pathname === group.href || pathname.startsWith(`${group.href}/`);
}

function filterWorkspaceNavForRole(
  groups: NavigationGroup[],
  workspaceRole?: WorkspaceRole | null,
): NavigationGroup[] {
  // 会话未就绪时暂不筛，避免先闪错角色首页
  if (workspaceRole == null) {
    return groups;
  }

  const allowedHomeId = roleHomeNavIdForRole(workspaceRole);

  return groups.map((group) => {
    if (group.id !== "workspace" || !group.children?.length) {
      return group;
    }
    return {
      ...group,
      children: group.children.filter((child) => child.id === allowedHomeId),
    };
  });
}

export function getNavigationGroups(
  platformRole?: "platform_admin" | null,
  workspaceRole?: WorkspaceRole | null,
): NavigationGroup[] {
  if (platformRole === "platform_admin") {
    return platformAdminNavigationGroups;
  }
  return filterWorkspaceNavForRole(workspaceNavigationGroups, workspaceRole);
}

export interface ActiveNavigationItem {
  groupTitle: string;
  title: string;
  href: string;
}

export function getActiveNavItem(
  pathname: string,
  platformRole?: "platform_admin" | null,
  searchParams?: NavSearchParams,
  workspaceRole?: WorkspaceRole | null,
): ActiveNavigationItem | undefined {
  const groups = getNavigationGroups(platformRole, workspaceRole);
  const allLinks = [
    ...groups.flatMap((group) => group.children ?? []),
    ...hiddenNavigationLinksForMatching,
  ];
  let best: { item: ActiveNavigationItem; score: number } | undefined;

  for (const group of groups) {
    if (group.href && groupDirectLinkMatches(group, pathname)) {
      const score = group.href.length + 1000;
      const candidate = { groupTitle: group.title, title: group.title, href: group.href };
      if (!best || score > best.score) {
        best = { item: candidate, score };
      }
    }

    for (const child of group.children ?? []) {
      const score = linkMatchScore(child, pathname, searchParams, allLinks);
      if (score < 0) continue;
      const candidate = { groupTitle: group.title, title: child.title, href: child.href };
      if (!best || score > best.score) {
        best = { item: candidate, score };
      }
    }
  }

  for (const hidden of hiddenNavigationLinksForMatching) {
    const score = linkMatchScore(hidden, pathname, searchParams, allLinks);
    if (score < 0) continue;
    const group = groups.find((item) => item.id === hidden.groupId);
    const candidate = {
      groupTitle: group?.title ?? "工作台",
      title: hidden.title,
      href: hidden.href,
    };
    if (!best || score > best.score) {
      best = { item: candidate, score };
    }
  }

  return best?.item;
}

export function isNavigationLinkActive(
  link: NavigationLink,
  pathname: string,
  searchParams?: NavSearchParams,
  platformRole?: "platform_admin" | null,
  workspaceRole?: WorkspaceRole | null,
): boolean {
  const allLinks = [
    ...getNavigationGroups(platformRole, workspaceRole).flatMap((group) => group.children ?? []),
    ...hiddenNavigationLinksForMatching,
  ];
  return linkMatchesPath(link, pathname, searchParams, allLinks);
}

export function isNavigationGroupActive(
  group: NavigationGroup,
  pathname: string,
  searchParams?: NavSearchParams,
  platformRole?: "platform_admin" | null,
  workspaceRole?: WorkspaceRole | null,
): boolean {
  const allLinks = [
    ...getNavigationGroups(platformRole, workspaceRole).flatMap((item) => item.children ?? []),
    ...hiddenNavigationLinksForMatching,
  ];
  if (group.href && groupDirectLinkMatches(group, pathname)) {
    return true;
  }
  if (
    (group.children ?? []).some((child) => linkMatchesPath(child, pathname, searchParams, allLinks))
  ) {
    return true;
  }
  return hiddenNavigationLinksForMatching.some(
    (hidden) =>
      hidden.groupId === group.id &&
      linkMatchesPath(hidden, pathname, searchParams, allLinks),
  );
}

export function getNavigationGroupHref(group: NavigationGroup): string {
  if (group.href) {
    return group.href;
  }
  return group.children?.[0]?.href ?? "/dashboard";
}

export const defaultExpandedNavigationGroupIds = new Set([
  "workspace",
  "acquisition",
  "customer-opportunity",
]);
