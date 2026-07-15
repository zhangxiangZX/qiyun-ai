"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Globe2,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  User,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { useApiResource } from "@/lib/api/use-api-resource";
import { createWorkspaceInvitation, updateWorkspaceMember, type WorkspaceMemberSummary } from "@/lib/auth/members";
import {
  loadWorkspaceInvitations,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  type InvitationSummary,
} from "@/lib/auth/invitations";
import {
  DATA_SCOPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  INVITE_ROLE_OPTIONS,
  accessRangeForRole,
  dataScopeForRole,
  formatInviteExpiry,
  maskEmail,
  maskPhone,
  otherPermissionsForRole,
  roleLabel,
  roleShortLabel,
  type InviteRole,
} from "@/lib/team/invite-helpers";
import {
  formatInviteDate,
  isValidEmail,
  mockInvitations,
  mockMembers,
  type MockInvitation,
  type MockMember,
} from "@/lib/team/invite-mock-data";
import { mapWorkspaceMemberToDisplay } from "@/lib/team/member-display";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/invite-member.module.css";

type PageTab = "invite" | "edit";

const PAGE_SIZE = 10;

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#06b6d4", "#22c55e", "#ec4899"];

function scopeIcon(tone: "blue" | "green" | "orange") {
  const cls =
    tone === "blue"
      ? `${styles.scopeIcon} ${styles.scopeIconBlue}`
      : tone === "green"
        ? `${styles.scopeIcon} ${styles.scopeIconGreen}`
        : `${styles.scopeIcon} ${styles.scopeIconOrange}`;
  const Icon = tone === "blue" ? Globe2 : tone === "green" ? User : Users;
  return (
    <span className={cls}>
      <Icon size={18} />
    </span>
  );
}

function roleTagClass(role: string) {
  if (role === "admin") return styles.roleTagAdmin;
  if (role === "viewer") return styles.roleTagViewer;
  return styles.roleTagSales;
}

function previewRoleTagClass(role: string) {
  if (role === "admin") return styles.tagAdmin;
  if (role === "viewer") return styles.tagViewer;
  return styles.tagSales;
}

function statusClass(status: MockInvitation["status"]) {
  if (status === "accepted") return styles.statusAccepted;
  if (status === "expired") return styles.statusExpired;
  return styles.statusPending;
}

function mapInvitation(invitation: InvitationSummary): MockInvitation {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status:
      invitation.status === "revoked"
        ? "expired"
        : invitation.status === "accepted"
          ? "accepted"
          : invitation.status === "expired"
            ? "expired"
            : "pending",
    invitedAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  };
}

function PreviewPanel({
  name,
  email,
  phone,
  department,
  role,
  status,
  expiresAt,
}: {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: InviteRole | MockMember["role"];
  status?: string;
  expiresAt?: string;
}) {
  const initials = name.trim().slice(0, 1) || email.slice(0, 1).toUpperCase() || "?";
  const displayPhone = phone.trim() ? maskPhone(phone) : "接受邀请后完善";
  const displayEmail = email.trim() || "—";
  const displayDept = department.trim() || "接受邀请后完善";

  const permissionRows = [
    { label: "角色", value: roleLabel(role) },
    { label: "数据权限", value: dataScopeForRole(role) },
    { label: "可访问范围", value: accessRangeForRole(role) },
    { label: "其他权限", value: otherPermissionsForRole(role) },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.previewCard}>
        {status ? <span className={`${styles.tagPending} ${styles.previewStatusCorner}`}>{status}</span> : null}

        <h3 className={styles.previewTitle}>成员信息预览</h3>
        <div className={styles.previewProfile}>
          <div className={styles.previewAvatar}>{initials}</div>
          <div className="min-w-0 flex-1">
            <div className={styles.previewNameRow}>
              <h4 className={styles.previewName}>{name || "待填写姓名"}</h4>
              <span className={previewRoleTagClass(role)}>{roleShortLabel(role)}</span>
            </div>
            <div className={styles.previewMeta}>
              <div className={styles.previewContactRow}>
                <span className={styles.previewContactIcon}><Phone size={14} /></span>
                <span>{displayPhone}</span>
              </div>
              <div className={styles.previewContactRow}>
                <span className={styles.previewContactIcon}><Mail size={14} /></span>
                <span>{displayEmail}</span>
              </div>
              <div className={styles.previewContactRow}>
                <span className={styles.previewContactIcon}><Building2 size={14} /></span>
                <span>{displayDept}</span>
              </div>
            </div>
          </div>
        </div>

        {expiresAt ? (
          <>
            <div className={styles.previewDivider} />
            <p className={styles.previewExpiry}>{formatInviteExpiry(expiresAt)}</p>
          </>
        ) : null}

        <div className={styles.previewDivider} />
        <h4 className={styles.previewSectionTitle}>权限摘要</h4>
        <div className={styles.previewPermissionList}>
          {permissionRows.map((row) => (
            <div key={row.label} className={styles.previewPermissionItem}>
              <Check size={14} className={styles.previewPermissionIcon} />
              <div className={styles.previewPermissionBody}>
                <p className={styles.previewPermissionLabel}>{row.label}</p>
                <p className={styles.previewPermissionValue}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

let nextInvId = 100;

export function InviteMemberWorkspace() {
  const [pageTab, setPageTab] = useState<PageTab>("invite");
  const [recordsPage, setRecordsPage] = useState(1);

  const {
    data: apiMembers,
    loading: membersLoading,
    error: membersError,
    isPreview,
    refetch: refetchMembers,
  } = useApiResource<WorkspaceMemberSummary[]>("/auth/workspace-members", []);

  const members = useMemo(
    () => (isPreview ? mockMembers : apiMembers.map(mapWorkspaceMemberToDisplay)),
    [apiMembers, isPreview],
  );

  const [invitations, setInvitations] = useState<MockInvitation[]>(mockInvitations);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  const loadInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const items = await loadWorkspaceInvitations();
      setInvitations(items.map(mapInvitation));
    } catch {
      if (isPreview) setInvitations(mockInvitations);
    } finally {
      setInvitationsLoading(false);
    }
  }, [isPreview]);

  useEffect(() => {
    if (!isPreview) void loadInvitations();
  }, [isPreview, loadInvitations]);

  useOnWorkspaceChanged(() => {
    refetchMembers();
    if (!isPreview) void loadInvitations();
  });

  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState<string>(DEPARTMENT_OPTIONS[0]);
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteMethod, setInviteMethod] = useState<"email">("email");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [localMembers, setLocalMembers] = useState<MockMember[] | null>(null);
  const displayMembers = localMembers ?? members;
  const editableMembers = useMemo(
    () => displayMembers.filter((member) => member.role !== "owner"),
    [displayMembers],
  );

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const selectedMember = editableMembers.find((member) => member.userId === selectedMemberId) ?? null;
  const [editRole, setEditRole] = useState<InviteRole>("member");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMember && editableMembers[0]) {
      setSelectedMemberId(editableMembers[0].userId);
    }
  }, [editableMembers, selectedMember]);

  useEffect(() => {
    if (!selectedMember) return;
    setEditRole(
      selectedMember.role === "admin" || selectedMember.role === "viewer"
        ? selectedMember.role
        : "member",
    );
    setEditEnabled(selectedMember.enabled);
    setEditError(null);
  }, [selectedMember]);

  const [confirmResendId, setConfirmResendId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmLoad, setConfirmLoad] = useState(false);

  const previewExpiresAt = useMemo(
    () => new Date(Date.now() + 7 * 86_400_000).toISOString(),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(invitations.length / PAGE_SIZE));
  const pagedInvitations = invitations.slice((recordsPage - 1) * PAGE_SIZE, recordsPage * PAGE_SIZE);

  const handleSendInvite = useCallback(async () => {
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setEmailError("请输入邮箱地址");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("邮箱格式不正确");
      return;
    }
    setEmailError(null);
    setSending(true);
    setInviteError(null);

    try {
      if (isPreview) {
        const now = new Date().toISOString();
        setInvitations((prev) => [
          {
            id: `inv-${++nextInvId}`,
            email: trimmedEmail,
            role: inviteRole,
            status: "pending",
            invitedAt: now,
            expiresAt: previewExpiresAt,
          },
          ...prev,
        ]);
      } else {
        await createWorkspaceInvitation({ email: trimmedEmail, role: inviteRole });
        await loadInvitations();
      }
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
      setInviteNote("");
      setRecordsPage(1);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "发送邀请失败，请稍后重试。");
    } finally {
      setSending(false);
    }
  }, [inviteEmail, inviteRole, isPreview, loadInvitations, previewExpiresAt]);

  const handleResend = useCallback(
    async (invitationId: string) => {
      setConfirmLoad(true);
      try {
        if (isPreview) {
          setInvitations((prev) =>
            prev.map((inv) =>
              inv.id === invitationId
                ? { ...inv, status: "pending" as const, invitedAt: new Date().toISOString() }
                : inv,
            ),
          );
        } else {
          await resendWorkspaceInvitation(invitationId);
          await loadInvitations();
        }
      } finally {
        setConfirmLoad(false);
        setConfirmResendId(null);
      }
    },
    [isPreview, loadInvitations],
  );

  const handleRevoke = useCallback(
    async (invitationId: string) => {
      setConfirmLoad(true);
      try {
        if (isPreview) {
          setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        } else {
          await revokeWorkspaceInvitation(invitationId);
          await loadInvitations();
        }
      } finally {
        setConfirmLoad(false);
        setConfirmRevokeId(null);
      }
    },
    [isPreview, loadInvitations],
  );

  const handleSaveMember = useCallback(async () => {
    if (!selectedMember) return;
    setEditSaving(true);
    setEditError(null);

    try {
      if (isPreview) {
        setLocalMembers((prev) => {
          const list = prev ?? members;
          return list.map((member) =>
            member.userId === selectedMember.userId
              ? { ...member, role: editRole, enabled: editEnabled }
              : member,
          );
        });
        return;
      }

      const patch: { role?: InviteRole; status?: "active" | "disabled" } = {};
      if (editRole !== selectedMember.role) patch.role = editRole;
      if (editEnabled !== selectedMember.enabled) {
        patch.status = editEnabled ? "active" : "disabled";
      }
      if (Object.keys(patch).length === 0) return;

      const updated = await updateWorkspaceMember(selectedMember.userId, patch);
      const mapped = mapWorkspaceMemberToDisplay(updated);
      setLocalMembers((prev) => {
        const list = prev ?? members;
        return list.map((member) => (member.userId === mapped.userId ? mapped : member));
      });
      void refetchMembers();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setEditSaving(false);
    }
  }, [selectedMember, editRole, editEnabled, members, isPreview, refetchMembers]);

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteName("");
    setInvitePhone("");
    setInviteNote("");
    setEmailError(null);
  };

  if (membersLoading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="邀请成员" />
        </ConsolePageAlerts>
        <div className={styles.pageTitle}>
          <p className={styles.breadcrumb}>
            团队成员<span className={styles.breadcrumbSep}>/</span>邀请成员
          </p>
          <h1>邀请成员 / 编辑成员</h1>
        </div>
        <div className={styles.feedback}>加载中…</div>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="邀请成员" />
        {membersError ? (
          <div className={`${styles.feedback} ${styles.feedbackError}`}>成员数据加载失败：{membersError}</div>
        ) : null}
        {inviteError ? (
          <div className={`${styles.feedback} ${styles.feedbackError}`}>{inviteError}</div>
        ) : null}
      </ConsolePageAlerts>

      <div className={styles.pageTitle}>
        <p className={styles.breadcrumb}>
          团队成员<span className={styles.breadcrumbSep}>/</span>邀请成员
        </p>
        <h1>邀请成员 / 编辑成员</h1>
      </div>

      <nav className={styles.pageTabs} aria-label="邀请成员选项卡">
        {([
          { id: "invite" as const, label: "邀请新成员" },
          { id: "edit" as const, label: "编辑成员" },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={pageTab === tab.id ? `${styles.pageTab} ${styles.pageTabActive}` : styles.pageTab}
            onClick={() => setPageTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.page}>
        <div className={styles.main}>
          {pageTab === "invite" ? (
            <div className={styles.formCard}>
              <h2 className={styles.formCardTitle}>邀请新成员</h2>

              <div className={styles.formGrid}>
                <label>
                  <span className={styles.fieldLabel}>
                    姓名 <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.fieldInput}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="请输入真实姓名"
                  />
                </label>

                <label>
                  <span className={styles.fieldLabel}>
                    手机号 <span className={styles.required}>*</span>
                  </span>
                  <div className={styles.phoneGroup}>
                    <span className={styles.phonePrefix}>
                      +86 <ChevronDown size={14} />
                    </span>
                    <input
                      className={styles.phoneInput}
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      placeholder="请输入手机号"
                    />
                  </div>
                </label>

                <label className={styles.formGridFull}>
                  <span className={styles.fieldLabel}>邮箱</span>
                  <input
                    className={styles.fieldInput}
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="name@company.com"
                  />
                  {emailError ? <p className={styles.fieldError}>{emailError}</p> : null}
                </label>

                <label className={styles.formGridFull}>
                  <span className={styles.fieldLabel}>
                    所属部门 <span className={styles.required}>*</span>
                  </span>
                  <select
                    className={styles.fieldSelect}
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                  >
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.sectionBlock}>
                <p className={styles.sectionLabel}>
                  角色 <span className={styles.required}>*</span>
                </p>
                <div className={styles.rolePills}>
                  {INVITE_ROLE_OPTIONS.map((option) => {
                    const active = inviteRole === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={active ? `${styles.rolePill} ${styles.rolePillActive}` : styles.rolePill}
                        onClick={() => setInviteRole(option.value)}
                      >
                        {active ? <Check size={14} className={styles.roleCardCheck} /> : null}
                        {roleShortLabel(option.value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <p className={styles.sectionLabel}>数据权限</p>
                <div className={styles.scopeCards}>
                  {DATA_SCOPE_OPTIONS.map((option) => {
                    const active = option.roles.includes(inviteRole);
                    return (
                      <div
                        key={option.id}
                        className={active ? `${styles.scopeCard} ${styles.scopeCardActive}` : styles.scopeCard}
                      >
                        {scopeIcon(option.tone)}
                        <div>
                          <p className={styles.scopeTitle}>{option.label}</p>
                          <p className={styles.scopeDesc}>{option.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className={styles.hintText}>数据权限由所选角色自动匹配。</p>
              </div>

              <div className={styles.sectionBlock}>
                <span className={styles.fieldLabel}>备注</span>
                <div className={styles.textareaWrap}>
                  <textarea
                    className={styles.fieldTextarea}
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    placeholder="可填写邀请说明（仅本地记录）"
                    maxLength={200}
                  />
                  <span className={styles.charCount}>{inviteNote.length}/200</span>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <p className={styles.sectionLabel}>邀请方式</p>
                <div className={styles.methodGroup}>
                  <button type="button" className={styles.methodBtn} disabled>
                    <MessageSquare size={15} />
                    短信
                  </button>
                  <button
                    type="button"
                    className={
                      inviteMethod === "email"
                        ? `${styles.methodBtn} ${styles.methodBtnActive}`
                        : styles.methodBtn
                    }
                    onClick={() => setInviteMethod("email")}
                  >
                    <Mail size={15} />
                    邮件
                  </button>
                  <button type="button" className={styles.methodBtn} disabled>
                    <Link2 size={15} />
                    邀请链接
                  </button>
                </div>
                {!isPreview ? (
                  <p className={styles.v1Hint}>V1 实际仅通过邮件发送邀请；姓名、手机、部门用于预览，接受邀请后可在个人资料完善。</p>
                ) : null}
              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnSecondary} onClick={resetInviteForm}>
                  取消
                </button>
                <button type="button" className={styles.btnPrimary} disabled={sending} onClick={() => void handleSendInvite()}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  发送邀请
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.formCard}>
              <h2 className={styles.formCardTitle}>编辑成员</h2>

              {editableMembers.length === 0 ? (
                <p className={styles.hintText}>暂无可编辑成员</p>
              ) : (
                <>
                  <label className={styles.formGridFull}>
                    <span className={styles.fieldLabel}>选择成员</span>
                    <select
                      className={styles.fieldSelect}
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                    >
                      {editableMembers.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name}（{member.email}）
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedMember ? (
                    <>
                      <div className={styles.sectionBlock}>
                        <p className={styles.sectionLabel}>角色</p>
                        <div className={styles.rolePills}>
                          {INVITE_ROLE_OPTIONS.map((option) => {
                            const active = editRole === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={active ? `${styles.rolePill} ${styles.rolePillActive}` : styles.rolePill}
                                onClick={() => setEditRole(option.value)}
                              >
                                {active ? <Check size={14} className={styles.roleCardCheck} /> : null}
                                {roleShortLabel(option.value)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className={styles.sectionBlock}>
                        <div className={styles.toggleRow}>
                          <div>
                            <p className={styles.scopeTitle}>{editEnabled ? "账号已启用" : "账号已禁用"}</p>
                            <p className={styles.scopeDesc}>禁用后该成员将无法登录系统</p>
                          </div>
                          <button
                            type="button"
                            className={editEnabled ? `${styles.toggleSwitch} ${styles.toggleSwitchOn}` : styles.toggleSwitch}
                            onClick={() => setEditEnabled((prev) => !prev)}
                            aria-checked={editEnabled}
                            role="switch"
                          >
                            <span className={editEnabled ? `${styles.toggleKnob} ${styles.toggleKnobOn}` : styles.toggleKnob} />
                          </button>
                        </div>
                      </div>

                      {editError ? <div className={`${styles.feedback} ${styles.feedbackError}`}>{editError}</div> : null}

                      <div className={styles.formFooter}>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={() => {
                            if (!selectedMember) return;
                            setEditRole(
                              selectedMember.role === "admin" || selectedMember.role === "viewer"
                                ? selectedMember.role
                                : "member",
                            );
                            setEditEnabled(selectedMember.enabled);
                            setEditError(null);
                          }}
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          disabled={editSaving}
                          onClick={() => void handleSaveMember()}
                        >
                          {editSaving ? <Loader2 size={15} className="animate-spin" /> : null}
                          保存修改
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {pageTab === "invite" ? (
          <PreviewPanel
            name={inviteName || inviteEmail.split("@")[0] || ""}
            email={inviteEmail}
            phone={invitePhone}
            department={inviteDepartment}
            role={inviteRole}
            status="待接受"
            expiresAt={previewExpiresAt}
          />
        ) : selectedMember ? (
          <PreviewPanel
            name={selectedMember.name}
            email={selectedMember.email}
            phone=""
            department=""
            role={editRole}
          />
        ) : (
          <aside className={styles.sidebar}>
            <div className={styles.previewCard}>
              <p className={styles.hintText}>选择成员后可预览权限摘要</p>
            </div>
          </aside>
        )}
      </div>

      <section className={styles.recordsCard}>
        <div className={styles.recordsHeader}>最近邀请记录</div>

        {invitations.length === 0 ? (
          <div className={styles.feedback}>暂无邀请记录</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {["成员", "角色", "邀请方式", "状态", "发送时间", "操作"].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedInvitations.map((invitation, index) => {
                    const color = AVATAR_COLORS[index % AVATAR_COLORS.length]!;
                    return (
                      <tr key={invitation.id}>
                        <td>
                          <div className={styles.memberInfo}>
                            <div className={styles.memberAvatar} style={{ background: color }}>
                              {invitation.email.slice(0, 1).toUpperCase()}
                            </div>
                            <div className={styles.memberMeta}>
                              <h4>{invitation.email.split("@")[0]}</h4>
                              <p>{maskEmail(invitation.email)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={roleTagClass(invitation.role)}>{roleShortLabel(invitation.role)}</span>
                        </td>
                        <td>
                          <span className={styles.methodCell}>
                            <Mail size={14} />
                            邮件
                          </span>
                        </td>
                        <td>
                          <span className={statusClass(invitation.status)}>{statusLabel(invitation.status)}</span>
                        </td>
                        <td>{formatInviteDate(invitation.invitedAt)}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            {invitation.status === "pending" ? (
                              <>
                                <button type="button" className={styles.actionLink} onClick={() => setConfirmResendId(invitation.id)}>
                                  重新发送
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.actionLink} ${styles.actionLinkDanger}`}
                                  onClick={() => setConfirmRevokeId(invitation.id)}
                                >
                                  取消邀请
                                </button>
                              </>
                            ) : invitation.status === "expired" ? (
                              <>
                                <button type="button" className={styles.actionLink} onClick={() => setConfirmResendId(invitation.id)}>
                                  重新发送
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.actionLink} ${styles.actionLinkDanger}`}
                                  onClick={() => setConfirmRevokeId(invitation.id)}
                                >
                                  删除
                                </button>
                              </>
                            ) : (
                              <button type="button" className={styles.actionLink} onClick={() => setPageTab("edit")}>
                                查看详情
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>共 {invitations.length} 条</span>
              <div className={styles.paginationRight}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={recordsPage <= 1}
                  onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={page === recordsPage ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                    onClick={() => setRecordsPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={recordsPage >= totalPages}
                  onClick={() => setRecordsPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
                <select
                  className={styles.pageSizeSelect}
                  value={PAGE_SIZE}
                  disabled
                  aria-label="每页条数"
                >
                  <option value={10}>10 条/页</option>
                </select>
                {invitationsLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              </div>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmResendId}
        title="确认重新发送邀请"
        description={
          confirmResendId
            ? `将向 ${invitations.find((item) => item.id === confirmResendId)?.email ?? ""} 重新发送邀请邮件。`
            : ""
        }
        confirmLabel="重新发送"
        cancelLabel="取消"
        confirmLoading={confirmLoad}
        onCancel={() => setConfirmResendId(null)}
        onConfirm={() => {
          if (confirmResendId) void handleResend(confirmResendId);
        }}
      />

      <ConfirmDialog
        open={!!confirmRevokeId}
        title="确认取消邀请"
        description={
          confirmRevokeId
            ? `取消后，${invitations.find((item) => item.id === confirmRevokeId)?.email ?? ""} 将无法再通过当前邀请加入团队。`
            : ""
        }
        confirmLabel="确认取消"
        cancelLabel="返回"
        destructive
        confirmLoading={confirmLoad}
        onCancel={() => setConfirmRevokeId(null)}
        onConfirm={() => {
          if (confirmRevokeId) void handleRevoke(confirmRevokeId);
        }}
      />
    </ConsolePage>
  );
}

function statusLabel(status: MockInvitation["status"]) {
  if (status === "pending") return "待接受";
  if (status === "accepted") return "已接受";
  if (status === "expired") return "已过期";
  return status;
}
