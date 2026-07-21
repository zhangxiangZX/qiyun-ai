"use client";

import Link from "next/link";
import {
  Building2,
  ClipboardList,
  ScrollText,
  Settings2,
  Shield,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

import { PageHeader } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";

const SECTIONS = [
  {
    title: "团队与权限",
    items: [
      {
        title: "团队成员",
        description: "邀请成员、分配角色、查看在职状态。",
        href: "/dashboard/team",
        icon: Users,
      },
      {
        title: "角色权限",
        description: "配置管理员、销售等角色的功能访问范围。",
        href: "/dashboard/team/roles",
        icon: Shield,
      },
      {
        title: "企业资料",
        description: "维护公司名称、官网与对外展示信息。",
        href: "/dashboard/team/profile",
        icon: Building2,
      },
    ],
  },
  {
    title: "账号与 AI 规则",
    items: [
      {
        title: "个人设置",
        description: "修改登录密码、通知偏好与个人资料。",
        href: "/dashboard/settings/account",
        icon: UserCog,
      },
      {
        title: "AI 行为规则",
        description: "配置留资引导、报价话术与高风险问题处理。",
        href: "/dashboard/settings/business-rules",
        icon: Settings2,
      },
    ],
  },
  {
    title: "审计与运维",
    items: [
      {
        title: "操作日志",
        description: "查看成员对询盘、报价、知识库等关键操作的记录。",
        href: "/dashboard/logs",
        icon: ScrollText,
      },
      {
        title: "系统状态",
        description: "检查服务连通性与当前工作区运行模式。",
        href: "/dashboard/system-status",
        icon: Wrench,
      },
    ],
  },
] as const;

export function SettingsHubWorkspace() {
  return (
    <ConsolePage>
      <PageHeader
        variant="compact"
        title="系统设置"
        description="集中管理工作区成员、企业资料、AI 规则与审计入口；各子页保持独立配置。"
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="系统设置" />
      </ConsolePageAlerts>

      <ConsolePageSection className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-[0_8px_24px_rgba(18,102,255,0.06)]"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-control bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p>
                    <span className="mt-3 text-xs font-medium text-primary">进入设置 →</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section className="rounded-card border border-dashed border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">平台管理员</p>
              <p className="mt-1">
                试用申请审核、客户工作区开通请前往{" "}
                <Link href="/dashboard/super-admin" className="text-primary underline-offset-2 hover:underline">
                  超级管理员
                </Link>
                ；本页仅面向当前工作区管理员。
              </p>
            </div>
          </div>
        </section>
      </ConsolePageSection>
    </ConsolePage>
  );
}
