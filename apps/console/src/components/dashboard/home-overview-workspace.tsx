"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  MessageSquare,
  Users,
  Zap,
} from "lucide-react";

import { Alert, StatCard } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import {
  INQUIRY_LIST_PATH,
  inquiryDetailPath,
} from "@/components/dashboard/role-dashboard-shared";
import { fetchAuthSession } from "@/lib/auth/client";
import { formatUserDisplayName } from "@/lib/auth/display-name";
import { loadDashboardSnapshot } from "@/lib/dashboard/data";
import { dashboardWithBots } from "@/lib/dashboard/mock-data";
import type { DashboardSnapshot, RecentLead } from "@/lib/dashboard/types";

const KPI_VISUAL: Record<
  string,
  { icon: typeof Users; tone: "brand" | "success" | "warning" | "info" | "purple" }
> = {
  leads: { icon: MessageSquare, tone: "brand" },
  visitors: { icon: Users, tone: "info" },
  sessions: { icon: Zap, tone: "purple" },
  response: { icon: Clock3, tone: "warning" },
};

const QUICK_LINKS = [
  { title: "询盘中心", description: "查看客户咨询并进入跟进流程", href: INQUIRY_LIST_PATH },
  { title: "报价管理", description: "从询盘发起报价，跟踪发送与确认进度", href: "/dashboard/quotes" },
  { title: "快速录入", description: "录入电话、微信或转介绍客户", href: "/dashboard/quick-entry" },
  { title: "知识库", description: "上传资料与管理文档", href: "/dashboard/knowledge-bases" },
  { title: "AI 助手", description: "管理欢迎语与接待规则", href: "/dashboard/bots" },
  { title: "AI 测试", description: "验证知识库回答与留资引导", href: "/dashboard/conversations/test" },
  { title: "销售链接 / 二维码", description: "生成专属链接并追踪渠道转化", href: "/dashboard/channels/links" },
  { title: "AI 选型页", description: "管理客户选型页与留资入口", href: "/dashboard/bots/landing" },
  { title: "官网 Widget", description: "安装代码与域名白名单", href: "/dashboard/sites" },
] as const;

const ROLE_HOMES = [
  { title: "老板首页", href: "/dashboard/boss" },
  { title: "管理员首页", href: "/dashboard/admin" },
  { title: "销售首页", href: "/dashboard/sales-rep" },
] as const;

function statusLabel(status: RecentLead["status"]) {
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export function HomeOverviewWorkspace() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(dashboardWithBots);
  const [displayName, setDisplayName] = useState("团队成员");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [session, nextSnapshot] = await Promise.all([
          fetchAuthSession().catch(() => null),
          loadDashboardSnapshot({}),
        ]);

        if (session?.user) {
          setDisplayName(formatUserDisplayName(session.user));
        }
        setSnapshot(nextSnapshot);
      } catch {
        setSnapshot(dashboardWithBots);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const kpiMap = useMemo(() => {
    return new Map(snapshot.kpis.map((item) => [item.id, item]));
  }, [snapshot.kpis]);

  const highlightKpis = [
    kpiMap.get("leads"),
    kpiMap.get("visitors"),
    kpiMap.get("sessions"),
    kpiMap.get("response"),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="首页概览" />
        {error ? (
          <Alert variant="warning" title="数据加载异常">
            暂时无法连接正式数据，当前展示演示数据供界面预览。
          </Alert>
        ) : null}
      </ConsolePageAlerts>

      <div className="space-y-6">
        <section className="rounded-[28px] border border-border bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_48%,#f9fafb_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">首页概览</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {displayName}，今天继续把询盘转起来
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                收口 V1 核心链路：查看数据、处理询盘、维护知识库、检查会话与站点挂载状态。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={INQUIRY_LIST_PATH}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                去跟进询盘
              </Link>
              <Link
                href="/dashboard/quotes"
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
              >
                查看报价进度
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {ROLE_HOMES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {highlightKpis.map((item) => {
              const visual = KPI_VISUAL[item.id] ?? { icon: MessageSquare, tone: "brand" as const };
              const Icon = visual.icon;
              return (
                <StatCard
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  description={item.description}
                  icon={<Icon size={22} aria-hidden />}
                  iconTone={visual.tone}
                />
              );
            })}
          </section>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">快捷入口</h2>
                <p className="text-sm text-muted-foreground">进入 V1 常用管理页面</p>
              </div>
              <Link href="/dashboard/team" className="text-sm text-primary">
                团队与设置
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {QUICK_LINKS.map((item) => (
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
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">待优先处理</h2>
                <p className="text-sm text-muted-foreground">把最影响成交的动作放在前面</p>
              </div>
              <Link href="/dashboard/conversations" className="text-sm text-primary">
                查看会话
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              <Link href={INQUIRY_LIST_PATH} className="block rounded-2xl border border-border p-4 hover:bg-accent">
                <div className="font-medium text-foreground">高意向客户跟进</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  先查看高意向询盘、报价咨询和交期相关问题。
                </div>
              </Link>
              <Link href="/dashboard/quotes" className="block rounded-2xl border border-border p-4 hover:bg-accent">
                <div className="font-medium text-foreground">推进待确认报价</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  处理待发送、待确认与临期报价，避免商机流失。
                </div>
              </Link>
              <Link href="/dashboard/knowledge-bases" className="block rounded-2xl border border-border p-4 hover:bg-accent">
                <div className="font-medium text-foreground">补充知识库资料</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  若回答依据不足，优先补 PDF、参数表、交期与报价规则。
                </div>
              </Link>
              <Link href="/dashboard/sites" className="block rounded-2xl border border-border p-4 hover:bg-accent">
                <div className="font-medium text-foreground">检查站点挂载</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  确认 Widget 已嵌入、域名白名单生效、测试消息能收到。
                </div>
              </Link>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">最新询盘</h2>
                <p className="text-sm text-muted-foreground">从首页直接进入询盘详情</p>
              </div>
              <Link href={INQUIRY_LIST_PATH} className="text-sm text-primary">
                查看全部
              </Link>
            </div>
            {snapshot.recentLeads.length === 0 ? (
              <Alert variant="info" className="mt-4">
                暂无最近询盘，访客留资后会显示在这里。
              </Alert>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">客户</th>
                      <th className="px-4 py-3 font-medium">来源</th>
                      <th className="px-4 py-3 font-medium">问题</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.recentLeads.map((lead) => (
                      <tr key={lead.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <Link href={inquiryDetailPath(lead.id)} className="block hover:text-primary">
                            <div className="font-medium text-foreground">{lead.name}</div>
                            <div className="text-xs text-muted-foreground">{lead.contact}</div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.sourceBot}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.lastQuestion}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-foreground">
                            {statusLabel(lead.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">高频问题</h2>
                <p className="text-sm text-muted-foreground">适合反向补充资料与优化欢迎语</p>
              </div>
              <Link href="/dashboard/bots/config" className="text-sm text-primary">
                去优化助手
              </Link>
            </div>
            {snapshot.frequentQuestions.length === 0 ? (
              <Alert variant="info" className="mt-4">
                暂无高频问题数据，访客开始咨询后会逐步汇总。
              </Alert>
            ) : (
              <div className="mt-4 space-y-3">
                {snapshot.frequentQuestions.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border p-4">
                    <div className="font-medium text-foreground">{item.question}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.botName ?? "默认助手"} · 提及 {item.count} 次
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </ConsolePage>
  );
}
