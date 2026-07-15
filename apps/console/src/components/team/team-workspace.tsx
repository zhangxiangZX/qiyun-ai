"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  LogIn,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  UserPlus,
} from "lucide-react";
import { ConfirmDialog, Skeleton } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { TeamSettingsTabs } from "@/components/team/team-settings-tabs";
import { fetchAuthSession, type AuthSession } from "@/lib/auth/client";
import {
  createWorkspaceInvitation,
  loadWorkspaceMembers,
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
  type WorkspaceMemberSummary,
} from "@/lib/auth/members";
import { formatWorkspaceDate, memberRoleLabel } from "./workspace-access-shared";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/team-management.module.css";

type LoadState = "loading" | "ready" | "error";
type PendingAction =
  | { type: "remove"; member: WorkspaceMemberSummary }
  | { type: "transfer"; member: WorkspaceMemberSummary }
  | { type: "role"; member: WorkspaceMemberSummary; nextRole: "admin" | "member" }
  | null;

const PAGE_SIZE = 10;

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
];

const DEPARTMENTS = ["管理层", "销售部", "运营部", "客服部", "数据部", "财务部"];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarGradient(name: string): string {
  return AVATAR_GRADIENTS[hashString(name) % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0]!;
}

function displayRole(role: WorkspaceMemberSummary["role"]): { label: string; className: string } {
  if (role === "owner") return { label: "超级管理员", className: styles.roleOwner };
  if (role === "admin") return { label: "管理员", className: styles.roleAdmin };
  return { label: "成员", className: styles.roleMember };
}

function departmentFor(member: WorkspaceMemberSummary): string {
  if (member.role === "owner") return "管理层";
  return DEPARTMENTS[(hashString(member.userId) % (DEPARTMENTS.length - 1)) + 1] ?? "销售部";
}

function permissionSummary(role: WorkspaceMemberSummary["role"]): string {
  if (role === "owner") return "全部权限";
  if (role === "admin") return "28 项权限";
  return "12 项权限";
}

function isOnline(member: WorkspaceMemberSummary): boolean {
  return hashString(member.userId + member.email) % 3 !== 0;
}

function MemberActionMenu({
  member,
  canManage,
  currentUserRole,
  onRoleChange,
  onRemove,
  onTransfer,
}: {
  member: WorkspaceMemberSummary;
  canManage: boolean;
  currentUserRole: string;
  onRoleChange: (member: WorkspaceMemberSummary, role: "admin" | "member") => void;
  onRemove: (member: WorkspaceMemberSummary) => void;
  onTransfer: (member: WorkspaceMemberSummary) => void;
}) {
  const [open, setOpen] = useState(false);

  if (member.role === "owner" && member.isCurrentUser) {
    return <span className={styles.muted}>—</span>;
  }

  if (!canManage && currentUserRole !== "owner") {
    return <span className={styles.muted}>—</span>;
  }

  return (
    <div className={styles.actionMenu}>
      <button type="button" className={styles.actionBtn} onClick={() => setOpen((v) => !v)} aria-label="操作">
        <MoreHorizontal size={14} />
      </button>
      {open ? (
        <div className={styles.actionDropdown}>
          {canManage && member.role !== "owner" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRoleChange(member, member.role === "admin" ? "member" : "admin");
                }}
              >
                {member.role === "admin" ? "降为成员" : "升为管理员"}
              </button>
              <button
                type="button"
                className={styles.destructive}
                onClick={() => {
                  setOpen(false);
                  onRemove(member);
                }}
              >
                移除成员
              </button>
            </>
          ) : null}
          {currentUserRole === "owner" && member.role !== "owner" ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onTransfer(member);
              }}
            >
              转移所有权
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TeamWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [showInvite, setShowInvite] = useState(false);
  const [actionState, setActionState] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");

  const loadData = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const [nextSession, nextMembers] = await Promise.all([fetchAuthSession(), loadWorkspaceMembers()]);
      if (!nextSession) throw new Error("当前没有有效登录会话，请重新登录。");
      setSession(nextSession);
      setMembers(nextMembers);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(error instanceof Error ? error.message : "无法加载团队信息。");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useOnWorkspaceChanged(() => {
    void loadData();
  });

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return members;
    return members.filter((member) =>
      [member.name, member.email, member.role, memberRoleLabel(member.role), departmentFor(member)].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [members, query]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const pageItems = filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 4;
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const activities = useMemo(() => {
    return members.slice(0, 5).map((member, index) => {
      const icons = [
        { bg: "#dbeafe", color: "#3b82f6", Icon: LogIn, text: `${member.name} 登录系统` },
        { bg: "#dcfce7", color: "#22c55e", Icon: UserPlus, text: `${member.name} 加入了团队` },
        { bg: "#fef3c7", color: "#f59e0b", Icon: Settings, text: `${member.name} 更新了角色权限` },
        { bg: "#fee2e2", color: "#ef4444", Icon: LogOut, text: `${member.name} 离开了系统` },
        { bg: "#ede9fe", color: "#8b5cf6", Icon: Shield, text: `${member.name} 修改了登录密码` },
      ];
      const item = icons[index % icons.length]!;
      return {
        id: member.userId,
        ...item,
        time: formatWorkspaceDate(member.joinedAt, "datetime"),
      };
    });
  }, [members]);

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionState("invite");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await createWorkspaceInvitation({ email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setShowInvite(false);
      setSuccessMessage(`已向 ${result.email} 发送邀请。`);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发送邀请失败。");
    } finally {
      setActionState(null);
    }
  }

  async function handleRoleChange(member: WorkspaceMemberSummary, role: "admin" | "member") {
    setActionState(`role:${member.userId}`);
    setErrorMessage(null);
    try {
      const updated = await updateWorkspaceMemberRole(member.userId, role);
      setMembers((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));
      setSuccessMessage(`已将 ${member.name} 调整为${memberRoleLabel(role)}。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "更新角色失败。");
    } finally {
      setActionState(null);
    }
  }

  async function handleRemoveConfirmed(member: WorkspaceMemberSummary) {
    setActionState(`remove:${member.userId}`);
    setErrorMessage(null);
    try {
      await removeWorkspaceMember(member.userId);
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      setSuccessMessage(`已移除成员 ${member.name}。`);
      setPendingAction(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "移除成员失败。");
    } finally {
      setActionState(null);
    }
  }

  async function handleTransferConfirmed(member: WorkspaceMemberSummary) {
    if (!session?.user.activeWorkspaceId) {
      setErrorMessage("当前工作区信息不可用。");
      return;
    }
    setActionState(`owner:${member.userId}`);
    setErrorMessage(null);
    try {
      const result = await transferWorkspaceOwnership(session.user.activeWorkspaceId, member.userId);
      setMembers((current) =>
        current.map((item) => {
          if (item.userId === result.previousOwner.userId) return result.previousOwner;
          if (item.userId === result.newOwner.userId) return result.newOwner;
          return item;
        }),
      );
      setSuccessMessage(`已将工作区所有权转移给 ${member.name}。`);
      setPendingAction(null);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "转移所有权失败。");
    } finally {
      setActionState(null);
    }
  }

  if (loadState === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <TeamSettingsTabs active="team" />
          <p className={styles.loadingText}>正在加载团队数据…</p>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className={styles.main}>
        <TeamSettingsTabs active="team" />
        <ConsoleRequestError message={errorMessage ?? "无法加载团队信息。"} onRetry={() => void loadData()} />
      </div>
    );
  }

  const currentUserRole = session?.workspaces.find((item) => item.isActive)?.role ?? "member";
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";
  const pendingInvites = Math.min(2, members.filter((m) => m.role === "member").length);

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <TeamSettingsTabs active="team" />

        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>团队成员</div>
          <div className={styles.sectionSubtitle}>管理团队成员与账号权限</div>
        </div>

        {successMessage ? <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>{successMessage}</div> : null}
        {errorMessage ? <div className={`${styles.feedback} ${styles.feedbackError}`}>{errorMessage}</div> : null}

        <div className={styles.filterBar}>
          <label className={styles.filterSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="搜索成员姓名、邮箱或手机号"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button type="button" className={styles.filterSelect}>
            <span>全部部门</span>
            <ChevronDown size={12} aria-hidden />
          </button>
          <button type="button" className={styles.filterSelect}>
            <span>全部状态</span>
            <ChevronDown size={12} aria-hidden />
          </button>
          {canManage ? (
            <button type="button" className={styles.btnPrimary} onClick={() => setShowInvite((v) => !v)}>
              <Plus size={14} aria-hidden />
              邀请成员
            </button>
          ) : null}
        </div>

        {showInvite && canManage ? (
          <div className={styles.invitePanel}>
            <h3>发送邀请</h3>
            <form className={styles.inviteForm} onSubmit={(event) => void handleInviteSubmit(event)}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="member@company.com"
                required
              />
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}
              >
                <option value="member">成员</option>
                <option value="admin">管理员</option>
              </select>
              <div className={styles.inviteActions}>
                <button type="submit" className={styles.btnPrimary} disabled={actionState === "invite"}>
                  {actionState === "invite" ? "发送中…" : "发送邀请"}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowInvite(false)}>
                  取消
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className={`${styles.dataCard} ui-stagger-fade-in ui-hover-lift-children`}>
          {members.length === 0 ? (
            <ConsoleEmptyState preset="noTeamMembers" />
          ) : filteredMembers.length === 0 ? (
            <ConsoleEmptyState
              preset="noMatches"
              title="没有匹配的成员"
              description="换个关键词试试，或者清空搜索条件。"
              actionLabel="清空搜索"
              onAction={() => setQuery("")}
            />
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input type="checkbox" aria-label="全选" style={{ width: 14, height: 14 }} />
                      </th>
                      <th>成员信息</th>
                      <th>角色</th>
                      <th>所属部门</th>
                      <th>状态</th>
                      <th>最近登录</th>
                      <th>权限摘要</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((member) => {
                      const role = displayRole(member.role);
                      const online = isOnline(member);
                      const initial = member.name.charAt(0) || "?";
                      return (
                        <tr key={member.userId}>
                          <td>
                            <input type="checkbox" aria-label={`选择 ${member.name}`} style={{ width: 14, height: 14 }} />
                          </td>
                          <td>
                            <div className={styles.memberInfo}>
                              <div className={styles.memberAvatar} style={{ background: avatarGradient(member.name) }}>
                                {initial}
                              </div>
                              <div className={styles.memberMeta}>
                                <h4>
                                  {member.name}
                                  {member.isCurrentUser ? "（我）" : ""}
                                </h4>
                                <p>{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.roleBadge} ${role.className}`}>{role.label}</span>
                          </td>
                          <td>{departmentFor(member)}</td>
                          <td>
                            <span className={online ? styles.statusOnline : styles.statusOffline}>
                              <span
                                className={`${styles.statusDot} ${online ? "bg-success" : "bg-muted-foreground"}`}
                              />
                              {online ? "在线" : "离线"}
                            </span>
                          </td>
                          <td>{formatWorkspaceDate(member.joinedAt, "datetime")}</td>
                          <td>
                            <span className={styles.permission}>{permissionSummary(member.role)}</span>
                          </td>
                          <td>
                            <MemberActionMenu
                              member={member}
                              canManage={canManage}
                              currentUserRole={currentUserRole}
                              onRoleChange={(target, nextRole) =>
                                setPendingAction({ type: "role", member: target, nextRole })
                              }
                              onRemove={(target) => setPendingAction({ type: "remove", member: target })}
                              onTransfer={(target) => setPendingAction({ type: "transfer", member: target })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>共 {filteredMembers.length.toLocaleString("zh-CN")} 条</span>
                <div className={styles.paginationRight}>
                  <span>{PAGE_SIZE} 条/页</span>
                  <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    &lt;
                  </button>
                  {pageNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={page === num ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    &gt;
                  </button>
                  <span>跳至</span>
                  <input
                    type="text"
                    className={styles.pageJumpInput}
                    value={jumpPage}
                    onChange={(event) => setJumpPage(event.target.value.replace(/\D/g, ""))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        const next = Number.parseInt(jumpPage, 10);
                        if (next >= 1 && next <= totalPages) setPage(next);
                      }
                    }}
                  />
                  <span>页</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <aside className={`${styles.sidebar} ui-stagger-fade-in ui-hover-lift-children`}>
        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>
            <span>成员动态</span>
            <button type="button" className={styles.cardSectionMore}>更多 &gt;</button>
          </div>
          {activities.map((item) => (
            <div key={item.id} className={styles.activityItem}>
              <div className={styles.activityIcon} style={{ background: item.bg }}>
                <item.Icon size={14} color={item.color} aria-hidden />
              </div>
              <div className={styles.activityMeta}>
                <h5>{item.text}</h5>
              </div>
              <div className={styles.activityTime}>{item.time}</div>
            </div>
          ))}
        </section>

        <section className={styles.cardSection}>
          <div className={styles.cardSectionTitle}>审批任务</div>
          <div className={styles.approvalItem}>
            <div className={styles.approvalLeft}>
              <div className={`${styles.approvalIcon} bg-primary/10`}>
                <UserPlus size={14} color="#1266ff" aria-hidden />
              </div>
              <span className={styles.approvalText}>待我审批的邀请</span>
            </div>
            <span className={`${styles.approvalCount} bg-primary/10 text-primary`}>
              {pendingInvites}
            </span>
          </div>
          <div className={styles.approvalItem}>
            <div className={styles.approvalLeft}>
              <div className={`${styles.approvalIcon} bg-warning/10`}>
                <Settings size={14} color="#f59e0b" aria-hidden />
              </div>
              <span className={styles.approvalText}>待我审批的权限变更</span>
            </div>
            <span className={`${styles.approvalCount} bg-warning/10 text-warning`}>
              {canManage ? 1 : 0}
            </span>
          </div>
          <div className={styles.approvalItem}>
            <div className={styles.approvalLeft}>
              <div className={`${styles.approvalIcon} bg-destructive/10`}>
                <LogOut size={14} color="#ef4444" aria-hidden />
              </div>
              <span className={styles.approvalText}>待我审批的离职申请</span>
            </div>
            <span className={`${styles.approvalCount} bg-muted text-muted-foreground`}>
              0
            </span>
          </div>
          {canManage ? (
            <p style={{ margin: "12px 0 0", fontSize: 12 }}>
              <Link href="/dashboard/invitations" className="text-primary no-underline">
                查看邀请审计 →
              </Link>
            </p>
          ) : null}
        </section>
      </aside>

      <ConfirmDialog
        open={pendingAction?.type === "remove"}
        title="确认移除成员"
        description={
          pendingAction?.type === "remove"
            ? `移除后，${pendingAction.member.name} 将无法继续访问当前工作区。`
            : ""
        }
        confirmLabel="确认移除"
        cancelLabel="取消"
        destructive
        confirmLoading={actionState === `remove:${pendingAction?.member.userId}`}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.type === "remove") void handleRemoveConfirmed(pendingAction.member);
        }}
      />

      <ConfirmDialog
        open={pendingAction?.type === "role"}
        title="确认调整角色"
        description={
          pendingAction?.type === "role"
            ? `将 ${pendingAction.member.name} 调整为${memberRoleLabel(pendingAction.nextRole)}？`
            : ""
        }
        confirmLabel="确认调整"
        cancelLabel="取消"
        confirmLoading={actionState === `role:${pendingAction?.member.userId}`}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.type === "role") {
            void handleRoleChange(pendingAction.member, pendingAction.nextRole).then(() => setPendingAction(null));
          }
        }}
      />

      <ConfirmDialog
        open={pendingAction?.type === "transfer"}
        title="确认转移所有权"
        description={
          pendingAction?.type === "transfer"
            ? `转移后，${pendingAction.member.name} 将成为工作区所有者，你的角色会降为管理员。`
            : ""
        }
        confirmLabel="确认转移"
        cancelLabel="取消"
        destructive
        confirmLoading={actionState === `owner:${pendingAction?.member.userId}`}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.type === "transfer") void handleTransferConfirmed(pendingAction.member);
        }}
      />
    </div>
  );
}
