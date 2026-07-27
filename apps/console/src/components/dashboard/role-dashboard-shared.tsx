"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { Alert, Button, Skeleton } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { fetchAuthSession } from "@/lib/auth/client";
import { formatUserDisplayName } from "@/lib/auth/display-name";
import { listSalesLinks, type SalesLinkView } from "@/lib/channels/api";
import { listBots } from "@/lib/bots/data";
import { listDocuments } from "@/lib/documents/data";
import { loadDashboardSnapshot } from "@/lib/dashboard/data";
import { dashboardWithBots } from "@/lib/dashboard/mock-data";
import type { DashboardSnapshot } from "@/lib/dashboard/types";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  fetchChannelAttribution,
  fetchInquiryAssignStats,
  fetchSalesOverview,
  listInquiries,
} from "@/lib/sales/api";
import type {
  ChannelAttributionItem,
  InquiryAssignStats,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";
import { listSites } from "@/lib/sites/data";
import type { SiteConfig } from "@/lib/sites/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

export const ROLE_PANEL_CLASS = "rounded-3xl border border-border bg-card p-5 shadow-sm";
export const ROLE_SECTION_GAP = "space-y-6";

export function RoleSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function formatLeadStatus(status: string) {
  switch (status) {
    case "new":
      return "新询盘";
    case "pending":
      return "跟进中";
    case "contacted":
      return "已联系";
    case "proposal":
      return "待报价";
    case "won":
      return "已成交";
    case "invalid":
      return "无效";
    default:
      return status;
  }
}

export const INQUIRY_LIST_PATH = "/dashboard/inquiries";

export function inquiryDetailPath(id: string) {
  return `/dashboard/inquiries/${id}`;
}

export interface RoleKpiItem {
  label: string;
  value: string;
  description: string;
}

function countTodayInquiries(leads: DashboardSnapshot["recentLeads"]) {
  const today = new Date().toDateString();
  return leads.filter((lead) => new Date(lead.createdAt).toDateString() === today).length;
}

export function buildBossKpis(snapshot: DashboardSnapshot): RoleKpiItem[] {
  const pending = snapshot.recentLeads.filter(
    (lead) => lead.status === "new" || lead.status === "pending",
  ).length;
  const proposal = snapshot.recentLeads.filter((lead) => lead.status === "proposal").length;
  const todayCount = countTodayInquiries(snapshot.recentLeads);
  const effective = snapshot.kpis.find((item) => item.id === "visitors")?.value ?? "--";

  return [
    {
      label: "今日询盘",
      value: String(todayCount || snapshot.recentLeads.length),
      description: "当日新增的客户咨询",
    },
    {
      label: "有效询盘",
      value: effective,
      description: "已识别为高意向的询盘",
    },
    {
      label: "待跟进客户",
      value: String(pending),
      description: "需销售尽快联系跟进",
    },
    {
      label: "待报价客户",
      value: String(proposal),
      description: "已进入报价推进阶段",
    },
  ];
}

export function buildAdminKpis(snapshot: DashboardSnapshot): RoleKpiItem[] {
  const unassigned = snapshot.recentLeads.filter((lead) => lead.status === "new").length;

  return [
    {
      label: "未分配询盘",
      value: String(unassigned),
      description: "等待分配或首次跟进",
    },
    {
      label: "在线助手",
      value: snapshot.hasBots ? "已启用" : "未配置",
      description: "官网接待机器人运行状态",
    },
    {
      label: "知识库资料",
      value: snapshot.hasBots ? "已接入" : "待上传",
      description: "产品文档与常见问答",
    },
    {
      label: "团队成员",
      value: "可管理",
      description: "销售与管理员协作配置",
    },
  ];
}

export function buildSalesKpis(snapshot: DashboardSnapshot): RoleKpiItem[] {
  const todayTasks = snapshot.recentLeads.filter(
    (lead) => lead.status === "new" || lead.status === "pending",
  ).length;
  const quotes = snapshot.recentLeads.filter((lead) => lead.status === "proposal").length;

  return [
    {
      label: "我的询盘",
      value: String(snapshot.recentLeads.length),
      description: "分配给我的客户咨询",
    },
    {
      label: "今日任务",
      value: String(todayTasks),
      description: "今日需完成的跟进事项",
    },
    {
      label: "逾期任务",
      value: "0",
      description: "已超过计划跟进时间",
    },
    {
      label: "我的报价",
      value: String(quotes),
      description: "进行中的报价单",
    },
  ];
}

export function formatShortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function useRoleDashboardData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(dashboardWithBots);
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [assignStats, setAssignStats] = useState<InquiryAssignStats | null>(null);
  const [salesLinks, setSalesLinks] = useState<SalesLinkView[]>([]);
  const [botCount, setBotCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [siteCount, setSiteCount] = useState(0);
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [displayName, setDisplayName] = useState("团队成员");

  const [refreshNotice, setRefreshNotice] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : false;
      setIsPreview(preview);

      const session = await fetchAuthSession().catch(() => null);
      if (session?.user) {
        setDisplayName(formatUserDisplayName(session.user));
      }

      if (preview) {
        setSnapshot(dashboardWithBots);
        setOverview(null);
        setChannels([]);
        setInquiries([]);
        setAssignStats(null);
        setSalesLinks([]);
        setBotCount(0);
        setDocumentCount(0);
        setSiteCount(0);
        if (silent) setRefreshNotice(true);
        return;
      }

      const [
        nextSnapshot,
        nextOverview,
        nextChannels,
        nextInquiries,
        nextAssignStats,
        nextSalesLinks,
        bots,
        documents,
        sites,
      ] = await Promise.all([
        loadDashboardSnapshot({}),
        fetchSalesOverview().catch(() => null),
        fetchChannelAttribution().catch(() => []),
        listInquiries({ limit: 200 }).catch(() => []),
        fetchInquiryAssignStats().catch(() => null),
        listSalesLinks().catch(() => []),
        listBots().catch(() => []),
        listDocuments().catch(() => []),
        listSites().catch(() => []),
      ]);

      setSnapshot(nextSnapshot);
      setOverview(nextOverview);
      setChannels(nextChannels);
      setInquiries(nextInquiries);
      setAssignStats(nextAssignStats);
      setSalesLinks(nextSalesLinks);
      setBotCount(bots.length);
      setDocumentCount(documents.length);
      setSites(sites);
      setSiteCount(sites.length);
      if (silent) {
        setRefreshNotice(true);
      }
    } catch (nextError) {
      setError(nextError);
      setIsPreview(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load(true);
  });

  const refresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const isEmpty =
    !snapshot.hasBots &&
    snapshot.recentLeads.length === 0 &&
    snapshot.kpis.every((item) => item.value === "0" || item.value === "--");

  return {
    loading,
    refreshing,
    error,
    isPreview,
    snapshot,
    overview,
    channels,
    inquiries,
    assignStats,
    salesLinks,
    botCount,
    documentCount,
    siteCount,
    sites,
    displayName,
    refresh,
    reload: load,
    isEmpty,
    refreshNotice,
    clearRefreshNotice: () => setRefreshNotice(false),
  };
}

export function RoleDashboardShell({
  feature,
  roleLabel,
  title,
  description,
  actions,
  loading,
  refreshing,
  error,
  isEmpty,
  refreshNotice,
  onClearRefreshNotice,
  onRetry,
  onRefresh,
  children,
}: {
  feature: string;
  roleLabel: string;
  title: string;
  description: string;
  actions?: ReactNode;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  isEmpty: boolean;
  refreshNotice?: boolean;
  onClearRefreshNotice?: () => void;
  onRetry: () => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const refreshButton = (
    <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
      <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      刷新
    </Button>
  );

  if (loading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature={feature} />
        </ConsolePageAlerts>
        <div className="space-y-4 py-4">
          <Skeleton className="h-28 w-full rounded-[28px]" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </ConsolePage>
    );
  }

  if (error) {
    const presentation = resolveRequestErrorPresentation(error, `无法加载${feature}。`);
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature={feature} />
        </ConsolePageAlerts>
        <div className="py-4">
          <ConsoleRequestError
            kind={presentation.kind}
            message={presentation.message}
            onRetry={onRetry}
          />
        </div>
      </ConsolePage>
    );
  }

  if (isEmpty) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature={feature} />
        </ConsolePageAlerts>
        <div className="py-4">
          <ConsoleEmptyState
            preset="noLeads"
            title={`${roleLabel}暂无业务数据`}
            description="请先配置助手、挂载官网 Widget，并开始接待访客，询盘数据会逐步出现在这里。"
            action={<DashboardEmptyAction />}
          />
        </div>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature={feature} />
        {refreshNotice ? (
          <ConsoleFeedback
            variant="success"
            title="数据已刷新"
            message="首页指标与最近线索已更新。"
            onDismiss={onClearRefreshNotice}
          />
        ) : null}
      </ConsolePageAlerts>
      <div className="space-y-6 py-4">
        <section className="rounded-[28px] border border-border bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_48%,#f9fafb_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
              {/* 顶栏已有问候标题，这里只保留说明，避免双头 */}
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description || title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions}
              {refreshButton}
            </div>
          </div>
        </section>
        {children}
      </div>
    </ConsolePage>
  );
}

export function RoleKpiGrid({
  snapshot,
  items,
}: {
  snapshot?: DashboardSnapshot;
  items?: RoleKpiItem[];
}) {
  const kpiItems =
    items ??
    snapshot?.kpis.slice(0, 4).map((item) => ({
      label: item.label,
      value: item.value,
      description: item.description,
    })) ??
    [];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpiItems.map((item) => (
        <article key={item.label} className={ROLE_PANEL_CLASS}>
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <div className="mt-3 text-3xl font-semibold text-foreground">{item.value}</div>
          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
        </article>
      ))}
    </section>
  );
}

export function RoleQuickLinks({
  links,
}: {
  links: { title: string; description: string; href: string }[];
}) {
  return (
    <ConsolePageSection>
      <div className={`${ROLE_PANEL_CLASS} space-y-4`}>
        <RoleSectionHeader
          title="快捷入口"
          description="沿询盘 → 报价 → 跟进链路进入常用页面。"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/40 hover:bg-accent"
            >
              <div className="font-medium text-foreground">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </ConsolePageSection>
  );
}

export function RoleRecentLeadsPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const leads = snapshot.recentLeads.slice(0, 6);
  return (
    <ConsolePageSection>
      <div className={`${ROLE_PANEL_CLASS} space-y-4`}>
        <RoleSectionHeader
          title="最近询盘"
          description="优先处理新询盘和高意向客户，必要时进入报价推进成交。"
          action={
            <Link href={INQUIRY_LIST_PATH} className="text-sm text-primary">
              查看全部询盘
            </Link>
          }
        />
        {leads.length === 0 ? (
          <Alert variant="info">暂无最近询盘，访客留资后会显示在这里。</Alert>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">客户</th>
                  <th className="px-4 py-3 font-medium">来源助手</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={inquiryDetailPath(lead.id)} className="block hover:text-primary">
                        <div className="font-medium text-foreground">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.contact}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.sourceBot}</td>
                    <td className="px-4 py-3">{formatLeadStatus(lead.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatShortDateTime(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConsolePageSection>
  );
}

export function RoleSetupChecklist({
  items,
}: {
  items: { title: string; description: string; href: string; done?: boolean }[];
}) {
  return (
    <ConsolePageSection>
      <div className={`${ROLE_PANEL_CLASS} space-y-4`}>
        <RoleSectionHeader
          title="系统配置待办"
          description="管理员优先完成这些配置，销售才能顺利获客、报价和跟进。"
        />
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.href}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-foreground">{item.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
              </div>
              <Button asChild variant={item.done ? "outline" : "default"} size="sm">
                <Link href={item.href}>{item.done ? "查看" : "去配置"}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ConsolePageSection>
  );
}

export function RoleNotice({
  title,
  message,
  onDismiss,
}: {
  title: string;
  message?: string;
  onDismiss?: () => void;
}) {
  return (
    <ConsoleFeedback variant="success" title={title} message={message} onDismiss={onDismiss} />
  );
}
