"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  Clock,
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Wifi,
} from "lucide-react";
import {
  Badge,
  Button,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import type { WorkspaceMemberSummary } from "@/lib/auth/members";
import { useApiResource } from "@/lib/api/use-api-resource";
import { mapWorkspaceMemberToTableRow } from "@/lib/team/member-display";

interface Member {
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  status: "在线" | "离线";
  lastLogin: string;
  tasks: number;
}

const MEMBERS: Member[] = [
  { name: "张伟", email: "zhangwei@qiyun.com", role: "超级管理员", department: "总经办", phone: "138 5712 6888", status: "在线", lastLogin: "2024-06-01 09:30", tasks: 24 },
  { name: "李娜", email: "lina@qiyun.com", role: "销售经理", department: "销售一部", phone: "139 0000 1234", status: "在线", lastLogin: "2024-06-01 09:15", tasks: 18 },
  { name: "王磊", email: "wanglei@qiyun.com", role: "销售专员", department: "销售一部", phone: "137 0011 2233", status: "在线", lastLogin: "2024-05-31 18:40", tasks: 31 },
  { name: "陈晨", email: "chenchen@qiyun.com", role: "市场专员", department: "市场部", phone: "136 0022 3344", status: "离线", lastLogin: "2024-05-31 17:25", tasks: 12 },
  { name: "赵宇", email: "zhaoyu@qiyun.com", role: "客服专员", department: "客户成功部", phone: "135 0033 4455", status: "在线", lastLogin: "2024-06-01 08:50", tasks: 27 },
  { name: "周婷", email: "zhouting@qiyun.com", role: "数据分析师", department: "数据部", phone: "134 0044 5566", status: "离线", lastLogin: "2024-05-30 16:10", tasks: 9 },
  { name: "孙锐", email: "sunrui@qiyun.com", role: "销售专员", department: "销售二部", phone: "133 0055 6677", status: "在线", lastLogin: "2024-06-01 09:10", tasks: 22 },
  { name: "林琳", email: "linlin@qiyun.com", role: "行政", department: "行政人事部", phone: "132 0066 7788", status: "离线", lastLogin: "2024-05-29 14:32", tasks: 5 },
  { name: "郭涛", email: "guotao@qiyun.com", role: "销售专员", department: "销售二部", phone: "131 0077 8899", status: "在线", lastLogin: "2024-05-31 18:38", tasks: 19 },
  { name: "黄远运", email: "huyuan@qiyun.com", role: "市场专员", department: "市场部", phone: "130 0088 9900", status: "离线", lastLogin: "2024-05-28 11:05", tasks: 14 },
];

const ROLE_COLORS: Record<string, string> = {
  超级管理员: "#3b5eff",
  销售经理: "#22c55e",
  销售专员: "#f97316",
  市场专员: "#8b5cf6",
  客服专员: "#06b6d4",
  数据分析师: "#ec4899",
  行政: "#9ca3af",
};

const PENDING = [
  { name: "黄远运", email: "huyuan@qiyun.com", time: "2024-06-01 09:30", role: "销售专员" },
  { name: "孙锐", email: "sunrui@qiyun.com", time: "2024-06-01 09:10", role: "市场专员" },
  { name: "郭涛", email: "guotao@qiyun.com", time: "2024-05-31 18:40", role: "销售专员" },
  { name: "林琳", email: "linlin@qiyun.com", time: "2024-05-31 17:25", role: "销售专员" },
];

const ROLE_DISTRIBUTION = [
  { role: "超级管理员", count: 2, pct: 2.3 },
  { role: "销售经理", count: 8, pct: 9.3 },
  { role: "销售专员", count: 36, pct: 41.9 },
  { role: "市场专员", count: 12, pct: 14.0 },
  { role: "客服专员", count: 10, pct: 11.6 },
  { role: "数据分析师", count: 5, pct: 5.8 },
  { role: "其他", count: 14, pct: 15.3 },
];

const ACTIVITY_TOP = [
  { name: "张伟", count: 128 },
  { name: "李娜", count: 96 },
  { name: "王磊", count: 74 },
  { name: "陈晨", count: 58 },
  { name: "赵宇", count: 42 },
];

const RECENT_OPS = [
  { who: "张伟", text: "邀请了新成员 黄远思 加入团队", time: "2024-06-01 09:30" },
  { who: "李娜", text: "更新了角色权限：销售专员", time: "2024-06-01 09:15" },
  { who: "王禁", text: "成员退出了：5 名成员", time: "2024-05-31 17:40" },
  { who: "周婷", text: "邀请新成员：孙锐 加入申请", time: "2024-05-31 10:22" },
];

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? "#9ca3af";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {role}
    </span>
  );
}

function Donut({ data }: { data: { role: string; count: number; pct: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {data.map((d) => {
          const len = (d.count / total) * circumference;
          const seg = (
            <circle
              key={d.role}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={ROLE_COLORS[d.role] ?? "#9ca3af"}
              strokeWidth="14"
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="space-y-1">
        {data.map((d) => (
          <div key={d.role} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[d.role] ?? "#9ca3af" }} />
            <span className="text-foreground">{d.role}</span>
            <span className="text-muted-foreground">{d.count} ({d.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidePanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MembersWorkspace() {
  const { data: apiMembers, loading, isPreview, refetch } = useApiResource<WorkspaceMemberSummary[]>(
    "/auth/workspace-members",
    [],
  );

  const members = useMemo(
    () => (isPreview ? MEMBERS : apiMembers.map(mapWorkspaceMemberToTableRow)),
    [apiMembers, isPreview],
  );

  const maxActivity = useMemo(() => Math.max(...ACTIVITY_TOP.map((a) => a.count)), []);

  if (loading && !isPreview) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="团队成员" />
        </ConsolePageAlerts>
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="mt-4 h-96 w-full rounded-card" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="团队成员" />
      </ConsolePageAlerts>

      <PageHeader
        eyebrow="团队 / 成员"
        title="团队成员"
        description="管理团队成员、角色权限与活跃情况。"
        actions={
          <>
            <div className="relative">
              <Input placeholder="搜索成员姓名、手机号或邮箱" className="w-72" />
            </div>
            <Button asChild>
              <Link href="/dashboard/team/invite">
                <UserPlus size={14} /> 邀请成员
              </Link>
            </Button>
            <Button variant="outline" size="sm" type="button">
              <Download size={14} /> 批量导入
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/team/roles">
                <ShieldCheck size={14} /> 角色权限
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-4 grid gap-3 md:grid-cols-4 ui-stagger-fade-in ui-hover-lift-children">
        <StatCard label="成员总数" value={String(members.length)} trend={<span className="text-success text-sm">实时</span>} icon={<Users size={18} />} iconTone="brand" />
        <StatCard label="在线成员" value="23" description="当前在线占 26.7%" icon={<Wifi size={18} />} iconTone="success" />
        <StatCard label="本周新增" value="7" trend={<span className="text-warning text-sm">+3 · 79%</span>} icon={<UserPlus size={18} />} iconTone="warning" />
        <StatCard
          label="待审批邀请"
          value="4"
          icon={<Clock size={18} />}
          iconTone="purple"
          trend={<button className="text-primary text-sm hover:underline">去审批 &gt;</button>}
        />
      </div>

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-card p-3 shadow-card">
        <Select defaultValue="全部状态" className="h-9 w-28 text-sm">
          <option>全部状态</option>
          <option>在线</option>
          <option>离线</option>
        </Select>
        <Select defaultValue="全部角色" className="h-9 w-28 text-sm">
          <option>全部角色</option>
        </Select>
        <Select defaultValue="全部部门" className="h-9 w-28 text-sm">
          <option>全部部门</option>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Input placeholder="搜索成员..." className="h-9" />
        </div>
        <Button variant="outline" size="sm">
          <Filter size={14} /> 筛选
        </Button>
        <Button variant="outline" size="sm">
          <RefreshCw size={14} /> 刷新
        </Button>
      </div>

      {/* Main + sidebar */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <section className="rounded-card border border-border bg-card shadow-card">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {["成员信息", "角色", "所属部门", "手机号码", "状态", "最后登录时间", "任务数量", "操作"].map((h) => (
                      <th key={h} className="h-11 px-4 text-left align-middle text-xs font-medium uppercase text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.email} className="border-b border-border transition-colors hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {m.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{m.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.department}</td>
                      <td className="px-4 py-3 text-foreground">{m.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className={`h-2 w-2 rounded-full ${m.status === "在线" ? "bg-success" : "bg-muted-foreground/40"}`} />
                          <span className={m.status === "在线" ? "text-success" : "text-muted-foreground"}>{m.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.lastLogin}</td>
                      <td className="px-4 py-3 text-foreground">{m.tasks}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Link
                            href="/dashboard/team/invite"
                            className="inline-flex items-center gap-1 hover:underline"
                            aria-label="编辑"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button className="inline-flex items-center gap-1 hover:underline" aria-label="更多">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>共 {members.length} 条 · 1-5 页</span>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <Button variant="outline" size="sm" disabled>
                  上一页
                </Button>
                <Button variant="outline" size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  下一页
                </Button>
                <Select defaultValue="10条/页" className="h-9 w-24 text-sm">
                  <option>10条/页</option>
                  <option>20条/页</option>
                  <option>50条/页</option>
                </Select>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-4 lg:col-span-4">
          <SidePanel
            title="待审批邀请 (4)"
            action={
              <button className="text-xs text-primary hover:underline">查看全部</button>
            }
          >
            <ul className="space-y-3">
              {PENDING.map((p) => (
                <li key={p.email} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {p.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                      批准
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      拒绝
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </SidePanel>

          <SidePanel
            title="角色分布"
            action={
              <button className="text-xs text-primary hover:underline">查看详情</button>
            }
          >
            <Donut data={ROLE_DISTRIBUTION} />
            <p className="mt-3 text-center text-xs text-muted-foreground">Total 86 人</p>
          </SidePanel>

          <SidePanel title="成员活跃度 TOP5">
            <div className="space-y-2.5">
              {ACTIVITY_TOP.map((a) => (
                <div key={a.name} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-sm text-foreground">{a.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(a.count / maxActivity) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{a.count}次</span>
                </div>
              ))}
            </div>
          </SidePanel>

          <SidePanel title="最近操作记录">
            <ul className="space-y-3">
              {RECENT_OPS.map((op, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                  <div>
                    <p className="text-foreground">
                      <span className="font-medium">{op.who}</span> {op.text}
                    </p>
                    <p className="text-xs text-muted-foreground">{op.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SidePanel>
        </div>
      </div>
    </ConsolePage>
  );
}
