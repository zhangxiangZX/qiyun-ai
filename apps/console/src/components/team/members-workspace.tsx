"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import type { WorkspaceMemberSummary } from "@/lib/auth/members";
import {
  loadWorkspaceInvitations,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  type InvitationSummary,
} from "@/lib/auth/invitations";
import { useApiResource } from "@/lib/api/use-api-resource";
import { getApiErrorMessage } from "@/lib/api/errors";
import { mockInvitations } from "@/lib/team/invite-mock-data";
import { filterEnterpriseTeamMembers, mapWorkspaceMemberToTableRow } from "@/lib/team/member-display";
import { memberRoleLabel } from "@/components/team/workspace-access-shared";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

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

/** 预览数据仅含企业人员，不含当前管理员本人 / 超级管理员。 */
const MEMBERS: Member[] = [
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
  销售经理: "#22c55e",
  销售专员: "#f97316",
  市场专员: "#8b5cf6",
  客服专员: "#06b6d4",
  数据分析师: "#ec4899",
  行政: "#9ca3af",
  企业所有者: "#3b5eff",
  管理员: "#3b5eff",
  销售成员: "#f97316",
  只读访客: "#9ca3af",
};

function inviteDisplayName(email: string) {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : email;
}

const ACTIVITY_TOP = [
  { name: "李娜", count: 96 },
  { name: "王磊", count: 74 },
  { name: "陈晨", count: 58 },
  { name: "赵宇", count: 42 },
  { name: "孙锐", count: 38 },
];

const RECENT_OPS = [
  { who: "李娜", text: "更新了角色权限：销售专员", time: "2024-06-01 09:15" },
  { who: "王磊", text: "成员退出了：5 名成员", time: "2024-05-31 17:40" },
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
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
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

  const members = useMemo(() => {
    if (isPreview) return MEMBERS;
    return filterEnterpriseTeamMembers(apiMembers).map(mapWorkspaceMemberToTableRow);
  }, [apiMembers, isPreview]);

  const onlineCount = useMemo(
    () => members.filter((member) => member.status === "在线").length,
    [members],
  );

  const weekNewCount = useMemo(() => {
    if (isPreview) return 7;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filterEnterpriseTeamMembers(apiMembers).filter((member) => {
      const joined = Date.parse(member.joinedAt);
      return Number.isFinite(joined) && joined >= weekAgo;
    }).length;
  }, [apiMembers, isPreview]);

  const roleDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
    }
    const total = members.length || 1;
    return [...counts.entries()]
      .map(([role, count]) => ({
        role,
        count,
        pct: Math.round((count / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  const activityTop = useMemo(() => {
    if (!isPreview) return [] as typeof ACTIVITY_TOP;
    return ACTIVITY_TOP;
  }, [isPreview]);

  const recentOps = useMemo(() => {
    if (!isPreview) return [] as typeof RECENT_OPS;
    return RECENT_OPS;
  }, [isPreview]);

  const [pendingInvites, setPendingInvites] = useState<InvitationSummary[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadPendingInvites = useCallback(async () => {
    setInvitesLoading(true);
    setInviteActionError(null);
    try {
      if (isPreview) {
        setPendingInvites(
          mockInvitations
            .filter((item) => item.status === "pending")
            .map((item) => ({
              id: item.id,
              workspaceId: "preview",
              workspaceName: "预览工作区",
              email: item.email,
              role: item.role,
              status: item.status,
              token: "",
              inviteUrl: "",
              expiresAt: item.expiresAt,
              acceptedAt: null,
              createdAt: item.invitedAt,
              invitedBy: { userId: "preview", name: "预览", email: "preview@qiyun.ai" },
            })),
        );
        return;
      }

      const items = await loadWorkspaceInvitations();
      setPendingInvites(items.filter((item) => item.status === "pending"));
    } catch (error) {
      if (isPreview) {
        setPendingInvites([]);
      } else {
        setInviteActionError(getApiErrorMessage(error, "无法加载待处理邀请。"));
      }
    } finally {
      setInvitesLoading(false);
    }
  }, [isPreview]);

  useEffect(() => {
    void loadPendingInvites();
  }, [loadPendingInvites]);

  useOnWorkspaceChanged(() => {
    void loadPendingInvites();
  });

  const sidebarPending = useMemo(() => pendingInvites.slice(0, 4), [pendingInvites]);
  const confirmTarget =
    pendingInvites.find((item) => item.id === confirmApproveId || item.id === confirmRejectId) ?? null;

  async function handleApprove(invitationId: string) {
    setConfirmLoading(true);
    setInviteActionError(null);
    try {
      if (!isPreview) {
        await resendWorkspaceInvitation(invitationId);
        await loadPendingInvites();
      }
      setConfirmApproveId(null);
    } catch (error) {
      setInviteActionError(getApiErrorMessage(error, "批准邀请失败，请稍后重试。"));
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleReject(invitationId: string) {
    setConfirmLoading(true);
    setInviteActionError(null);
    try {
      if (isPreview) {
        setPendingInvites((current) => current.filter((item) => item.id !== invitationId));
      } else {
        await revokeWorkspaceInvitation(invitationId);
        await loadPendingInvites();
      }
      setConfirmRejectId(null);
    } catch (error) {
      setInviteActionError(getApiErrorMessage(error, "拒绝邀请失败，请稍后重试。"));
    } finally {
      setConfirmLoading(false);
    }
  }

  const maxActivity = useMemo(
    () => Math.max(...activityTop.map((a) => a.count), 1),
    [activityTop],
  );

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
        {inviteActionError ? (
          <Alert variant="warning" title="邀请操作失败">
            {inviteActionError}
          </Alert>
        ) : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
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
            <Button variant="outline" size="sm" type="button" disabled title="批量导入暂未开放">
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
        <StatCard label="成员总数" value={String(members.length)} trend={<span className="text-success text-sm">实时</span>} icon={<Users size={22} />} iconTone="brand" />
        <StatCard
          label="在线成员"
          value={String(onlineCount)}
          description={
            members.length
              ? `当前在线占 ${Math.round((onlineCount / members.length) * 1000) / 10}%`
              : "暂无成员"
          }
          icon={<Wifi size={22} />}
          iconTone="success"
        />
        <StatCard
          label="本周新增"
          value={String(weekNewCount)}
          icon={<UserPlus size={22} />}
          iconTone="warning"
        />
        <StatCard
          label="待处理邀请"
          value={String(pendingInvites.length)}
          icon={<Clock size={22} />}
          iconTone="purple"
          trend={
            <button
              type="button"
              className="text-primary text-sm hover:underline"
              onClick={() => {
                document.getElementById("pending-invites")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              去处理 &gt;
            </button>
          }
        />
      </div>

      {/* Filter bar */}
      <div className="console-filter-bar mt-4">
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
        <div className="relative min-w-0 flex-1 basis-[200px]">
          <Input placeholder="搜索成员..." className="h-9" />
        </div>
        <Button variant="outline" size="sm" type="button" disabled title="成员筛选即将完善">
          <Filter size={14} /> 筛选
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={() => void refetch()}>
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
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        暂无企业成员。当前登录账号不在此列表展示，可通过「邀请成员」添加人员。
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
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
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 opacity-50"
                            aria-label="编辑成员"
                            title="成员编辑即将上线"
                            disabled
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 opacity-50"
                            aria-label="更多"
                            title="更多操作即将上线"
                            disabled
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>共 {members.length} 条</span>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <Button variant="outline" size="sm" disabled title="当前页已全部展示">
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled aria-current="page">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled title="当前页已全部展示">
                  下一页
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-4 lg:col-span-4">
          <div id="pending-invites">
          <SidePanel
            title={`待处理邀请 (${pendingInvites.length})`}
            action={
              <Link href="/dashboard/invitations" className="text-xs text-primary hover:underline">
                查看全部
              </Link>
            }
          >
            {invitesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : sidebarPending.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无待处理邀请</p>
            ) : (
              <ul className="space-y-3">
                {sidebarPending.map((invite) => {
                  const name = inviteDisplayName(invite.email);
                  return (
                    <li key={invite.id} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {memberRoleLabel(invite.role)} · {invite.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          type="button"
                          disabled={confirmLoading}
                          onClick={() => {
                            setInviteActionError(null);
                            setConfirmApproveId(invite.id);
                          }}
                        >
                          批准
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          type="button"
                          disabled={confirmLoading}
                          onClick={() => {
                            setInviteActionError(null);
                            setConfirmRejectId(invite.id);
                          }}
                        >
                          拒绝
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SidePanel>
          </div>

          <SidePanel
            title="角色分布"
            action={
              <Link href="/dashboard/team/roles" className="text-xs text-primary hover:underline">
                查看详情
              </Link>
            }
          >
            {roleDistribution.length ? (
              <>
                <Donut data={roleDistribution} />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  共 {members.length} 人
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">暂无成员数据</p>
            )}
          </SidePanel>

          <SidePanel title="成员活跃度 TOP5">
            {activityTop.length ? (
              <div className="space-y-2.5">
                {activityTop.map((a) => (
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
            ) : (
              <p className="text-sm text-muted-foreground">暂无活跃度统计</p>
            )}
          </SidePanel>

          <SidePanel title="最近操作记录">
            {recentOps.length ? (
              <ul className="space-y-3">
                {recentOps.map((op, i) => (
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
            ) : (
              <p className="text-sm text-muted-foreground">暂无操作记录</p>
            )}
          </SidePanel>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmApproveId}
        title="确认批准邀请"
        description={
          confirmTarget
            ? `将向 ${confirmTarget.email} 重新发送邀请邮件，对方仍需通过邀请链接加入团队。`
            : ""
        }
        confirmLabel="批准并重发"
        cancelLabel="取消"
        confirmLoading={confirmLoading}
        onCancel={() => setConfirmApproveId(null)}
        onConfirm={() => {
          if (confirmApproveId) void handleApprove(confirmApproveId);
        }}
      />

      <ConfirmDialog
        open={!!confirmRejectId}
        title="确认拒绝邀请"
        description={
          confirmTarget
            ? `拒绝后，${confirmTarget.email} 将无法再通过当前邀请加入团队。`
            : ""
        }
        confirmLabel="确认拒绝"
        cancelLabel="返回"
        destructive
        confirmLoading={confirmLoading}
        onCancel={() => setConfirmRejectId(null)}
        onConfirm={() => {
          if (confirmRejectId) void handleReject(confirmRejectId);
        }}
      />
    </ConsolePage>
  );
}
